export const LOCALE_MAP: {
  [key: string]: {
    display: string,
    title: string
  }
} = {
  "detect": {display: "Auto", title: "Try to find a match using browser language settings, system language settings, or fallback to English."},
  "en": { display: "English", title: "English" },
  "es": { display: "Español", title: "Spanish" },
  "it": { display: "Italiano", title: "Italian" },
  "ja": { display: "日本語", title: "Japanese" },
  "ko": { display: "한국어", title: "Korean" },
  "pt_BR": { display: "Português", title: "Portuguese" },
  "ru": { display: "Русский", title: "Russian" },
  "tr": { display: "Türkçe", title: "Turkish" },
  "zh_CN": { display: "中文 (简体)", title: "Chinese (Simplified)" },
  "zh_TW": { display: "中文 (繁體)", title: "Chinese (Traditional)" }
}


export const AVAILABLE_LOCALES = ["en", "es", "it", "ja", "ko", "pt_BR", "ru", "tr", "zh_CN", "zh_TW"]
