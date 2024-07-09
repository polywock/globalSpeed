import { Gsm } from "./GsmType";

// adding a language guide
// Add language code to AVAILABLE_LOCALES (this file) 
// Add language information to LOCALE_MAP (this file) 
// Add language to static/_locales folder for name, description. 
// Add language to static/locales folder for all other translations. 
// Add language to tools/valideLocale.js "locales" list.
// run "node tools/validateLocale.js" to verify the locales/ file has all the same properties as static/en.json (reference)

declare global {
  interface Window {
    gsm?: Gsm
  }
}

export async function loadGsm(): Promise<Gsm> {
  const language = (await chrome.storage.local.get("g:language"))["g:language"]
  return readLocaleFile(getValidLocale(language))
}

export async function requestGsm(): Promise<Gsm> {
  return chrome.runtime.sendMessage({type: "REQUEST_GSM"})
}

export async function readLocaleFile(locale: string): Promise<Gsm> {
  const fetched = await fetch(chrome.runtime.getURL(`locales/${locale}.json`))
  const json = await fetched.json() as Gsm 
  json._lang = locale.replace("_", "-")
  return json 
}

function getValidLocale(overrideLang?: string) {
  if (overrideLang && AVAILABLE_LOCALES.has(overrideLang)) return overrideLang
  const languages = new Set(navigator.languages.map(l => l.replace("-", "_")))
  languages.forEach(l => {
    if (l.includes("_")) {
      const langPart = l.split("_")[0]
      languages.add(langPart)
    }
  })
  languages.add("en")
  return [...languages].find(l => AVAILABLE_LOCALES.has(l))
}

export function replaceArgs(raw: string, args: string[]) {
  let idx = 0
  for (let arg of args) {
    raw = raw.replaceAll(`$${++idx}`, arg)
  }
  return raw 
}

export const LOCALE_MAP: {
  [key: string]: {
    display: string,
    title: string
  }
} = {
  "detect": {display: "Auto", title: "Try to find a match using browser language settings, system language settings, or fallback to English."},
  "en": { display: "English", title: "English" },
  "es": { display: "Español", title: "Spanish" },
  "fr": { display: "Français", title: "French" },
  "id": { display: "Bahasa Indonesia", title: "Indonesian" },
  "it": { display: "Italiano", title: "Italian" },
  "ja": { display: "日本語", title: "Japanese" },
  "ko": { display: "한국어", title: "Korean" },
  "pt_BR": { display: "Português", title: "Portuguese" },
  "ru": { display: "Русский", title: "Russian" },
  "tr": { display: "Türkçe", title: "Turkish" },
  "uk": { display: "Українська", title: "Ukrainian" },
  "vi": { display: "Tiếng Việt", title: "Vietnamese" },
  "zh_CN": { display: "中文 (简体)", title: "Chinese (Simplified)" },
  "zh_TW": { display: "中文 (繁體)", title: "Chinese (Traditional)" },
  "ar": { display: "عربي", title: "Arabic" }
}


const AVAILABLE_LOCALES = new Set(["en", "es", "fr", "id", "it", "ja", "ko", "pt_BR", "ru", "tr", "uk", "vi", "zh_CN", "zh_TW", "ar"])

