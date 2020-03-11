import { SetState, FilterTarget } from "../types";
import { getConfigOrDefault } from "./configUtils";

declare global {
  interface Window {
    gsm?: Messages
  }
}


export const SUPPORTED_LANGS: {
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


export async function ensureGsmLoaded(): Promise<void> {
  const config = await getConfigOrDefault()
  if (!window.gsm) {
    if (chrome.runtime.getPackageDirectoryEntry) {
      window.gsm = await getMessages(config.language)
    } else {
      chrome.runtime.sendMessage({type: "REQUEST_GSM", language: config.language}, gsm => {
        window.gsm = gsm 
      })
    }
  }
}


type Messages = {
  [key: string]: string
}


export async function getMessages(overrideLang: string): Promise<Messages> {
  let systemLangs = await getAcceptLanguages()
  let langs = [overrideLang, ...navigator.languages, ...systemLangs, "en"].map(lang => (lang || "").replace("-", "_").toLowerCase())

  let localNameEntries = await getLocaleNameEntries()

  for (let lang of langs) {
    for (let pair of localNameEntries) {
      if (pair.name === lang) {
        let rawMessages = JSON.parse(await readFileEntryAsText(pair.entry))
        let outMessages: Messages = {}

        Object.keys(rawMessages).forEach(key => {
          outMessages[key] = rawMessages[key]?.message || ""
        })

        return outMessages
      }
    }
  }
}

type LocaleNameEntry = {name: string, entry: FileEntry}

function getLocaleNameEntry(localeEntry: DirectoryEntry): Promise<LocaleNameEntry> {
  return new Promise((res, rej) => {
    localeEntry.getFile("messages.json", undefined, entry => {
      res({name: localeEntry.name.replace("-", "_").toLowerCase(), entry})
    }, err => rej(err))
  })
}

function getLocaleNameEntries(): Promise<LocaleNameEntry[]> {
  return new Promise((res, rej) => {
    chrome.runtime.getPackageDirectoryEntry(root => {
      root.getDirectory("_locales", undefined, locales => {
        let reader = locales.createReader()
        reader.readEntries(entries => {
          Promise.all(
            entries.filter(entry => entry.isDirectory).map(localeEntry => getLocaleNameEntry(localeEntry as DirectoryEntry))
          ).then(out => res(out), err => rej(err))
        }, err => rej(err))
      }, err => rej(err))
    })
  })
}


function getAcceptLanguages(): Promise<string[]> {
  return new Promise((res, rej) => {
    chrome.i18n.getAcceptLanguages(langs => res(langs))
  })
}

function readFileEntryAsText(fileEntry: FileEntry): Promise<string> {
  return new Promise((res, rej) => {
    let reader = new FileReader()
    reader.addEventListener("loadend", () => {
      if (reader.error) {
        rej(reader.error)
      } else {
        res(reader.result as string)
      }
    })

    fileEntry.file(file => {
      reader.readAsText(file)
    }, err => {
      rej(err)
    })
  })
}