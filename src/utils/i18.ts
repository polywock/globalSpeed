import { SetState, FilterTarget } from "../types";
import { getConfigOrDefault } from "./configUtils";

declare global {
  interface Window {
    gsm?: Messages
  }
}


export const LOCALE_MAP: {
  [key: string]: {
    display: string,
    title: string
  }
} = {
  "detect": {display: "Auto", title: "Try to find a match using browser language settings, system language settings, or fallback to English."},
  "ar": { display: "العربية", title: "Arabic" },
  "en": { display: "English", title: "English" },
  "es": { display: "Español", title: "Spanish" },
  "hi": { display: "हिन्दी", title: "Hindu" },
  "ja": { display: "日本語", title: "Japanese" },
  "ko": { display: "한국어", title: "Korean" },
  "ru": { display: "Русский", title: "Russian" },
  "zh_CN": { display: "中文 (简体)", title: "Chinese (Simplified)" },
  "zh_TW": { display: "中文 (繁體)", title: "Chinese (Traditional)" }
}

export const AVAILABLE_LOCALES = ["ar", "en", "es", "hi", "ja", "ko", "ru", "zh_CN", "zh_TW"]


export async function ensureGsmLoaded(): Promise<void> {
  const config = await getConfigOrDefault()
  if (!window.gsm) {
    return new Promise((res, rej) => {
      chrome.runtime.sendMessage({type: "REQUEST_GSM", language: config.language}, gsm => {
        window.gsm = gsm 
        res()
      })
    })
  }
}


type Messages = {
  [key: string]: string
}


export async function getMessages(overrideLang: string): Promise<Messages> {
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


function getAcceptLanguages(): Promise<string[]> {
  return new Promise((res, rej) => {
    chrome.i18n.getAcceptLanguages(langs => res(langs))
  })
}

async function readLocaleFile(locale: string): Promise<Messages> {
  const fetched = await fetch(chrome.runtime.getURL(`_locales/${locale}/messages.json`))
  const json = await fetched.json()
  const messages: Messages = {}
  for (let key in json) {
    messages[key] = json[key].message
  }
  return messages
}

