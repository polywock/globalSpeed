import { Gsm } from "../types";
import { AVAILABLE_LOCALES } from "../defaults/i18";
import { subscribeView } from "./GlobalState";

declare global {
  interface Window {
    gsm?: Gsm
  }
}

export class GsmManager {
  gsm: Gsm
  loadedLang: {lang: string};
  client = subscribeView({language: true}, null, true, view => {
    this.loadLocale(view.language)
  })
  constructor(public lang: string) {
    this.loadLocale(lang)
    chrome.runtime.onMessage.addListener((msg, sender, reply) => {
      if (msg.type === "REQUEST_GSM") {
        reply(this.gsm)
      }
    })
  }
  loadLocale = async (lang: string, force = false) => {
    if (this.loadedLang && this.loadedLang.lang == lang) return 
    this.gsm = await loadGsm(lang)
    this.loadedLang = {lang} 
    window.gsm = this.gsm 
  }
}


export async function loadGsm(overrideLang: string): Promise<Gsm> {
  let systemLangs = await getAcceptLanguages()
  let prefLangs = [overrideLang, ...navigator.languages, ...systemLangs, "en"].map(lang => (lang || "").replace("-", "_").toLowerCase())

  for (let lang of prefLangs) {
    const localeIdx = AVAILABLE_LOCALES.findIndex(v => v.toLowerCase() === lang)
    if (localeIdx < 0) {
      continue
    }

    try {
      return readLocaleFile(AVAILABLE_LOCALES[localeIdx])
    } catch (err) { }
  }

  return readLocaleFile("en")
}


export async function readLocaleFile(locale: string): Promise<Gsm> {
  const fetched = await fetch(chrome.runtime.getURL(`locales/${locale}.json`))
  return await fetched.json()
}


function getAcceptLanguages(): Promise<string[]> {
  return new Promise((res, rej) => {
    chrome.i18n.getAcceptLanguages(langs => res(langs))
  })
}


