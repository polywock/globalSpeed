import { FilterEntry, TargetFx, TargetFxFlags, Gsm, URLCondition } from "../types";
import { clamp, round } from "./helper";
import { filterInfos } from "../defaults/filters";
import { MediaEvent } from "../contentScript/utils/applyMediaEvent";


export function conformSpeed(speed: number, rounding = 2) {
  return clamp(0.07, 16, round(speed, rounding))
}

export function formatSpeed(speed: number, isPinned: boolean) {
  return `${speed.toFixed(2)}${isPinned ? "i" : ""}`
}

export function formatSpeedForBadge(speed: number) {
  return speed.toFixed(2).slice(0, 4)
}

export function formatFilters(filterValues: FilterEntry[]) {
  let parts: string[] = []
  filterValues?.forEach(v => {
    const filterInfo = filterInfos[v.name]
    if (v.value != null && v.value !== filterInfo.default) {
      parts.push(filterInfo.format(v.value))
    }
  })
  return parts.join(" ")
}

export function checkFilterDeviation(values: FilterEntry[]) {
  for (let v of (values || [])) {
    const filterInfo = filterInfos[v.name]
    if (v.value != null && v.value !== filterInfo.default) {
      return true  
    }
  }
}

export function intoFxFlags(target: TargetFx) {
  const flags: TargetFxFlags = {}
  if (target === "backdrop" || target === "both") {
    flags.backdrop = true 
  }
  if (target === "element" || target === "both") {
    flags.element = true 
  }
  return flags 
}

export function sendMediaEvent(event: MediaEvent, key: string, tabId: number, frameId: number) {
  chrome.tabs.sendMessage(tabId, {type: "APPLY_MEDIA_EVENT", event, key}, frameId == null ? undefined : {frameId})
}

export function sendMessageToConfigSync(msg: any, tabId: number, frameId?: number) {
  chrome.tabs.sendMessage(tabId, msg, frameId == null ? undefined : {frameId})
}

export function requestGsm(): Promise<Gsm> {
  return new Promise((res, rej) => {
    chrome.runtime.sendMessage({type: "REQUEST_GSM"}, gsm => {
      if (chrome.runtime.lastError) {
        rej(chrome.runtime.lastError)
      } else { 
        res(gsm)
      }
    })
  })
}

export type SoundName = "good" | "bad"
let audioInfos = new Map<string, {audio: HTMLAudioElement, timeoutId: number}>()
export function playAudio(name: SoundName, volume: number) {
  if (!(volume > 0)) return 
  let { audio, timeoutId } = audioInfos.get(name) || {}
  timeoutId && clearTimeout(timeoutId)
  try {
    audio = audio || new Audio(chrome.runtime.getURL(`sounds/${name}.wav`))
    audioInfos.set(name, {audio, timeoutId: setTimeout(() => audioInfos.delete(name), 5 * 60000)})
    audio.volume = volume 
    audio.currentTime = 0
    audio.play()
  } catch (err) { }
}

export function checkURLCondition(url: string, cond: URLCondition, neutral?: boolean) {
  let failedAny = false  
  let passedAny = false 

  cond.parts.forEach(part => {
    if (part.disabled) return 
    let passed = false 

    if (part.type === "STARTS_WITH") {
      passed = url.startsWith(part.value)
    } else if (part.type === "CONTAINS") {
      passed = url.includes(part.value)
    } else if (part.type === "REGEX") {
  
      try {
        passed = new RegExp(part.value).test(url)
      } catch (err) {}
    } else {
      return 
    }

    if (part.inverse ? passed : !passed) {
      failedAny = true 
    } else {
      passedAny = true 
    }
  })

  if (!passedAny && !failedAny) return neutral

  if (cond.matchAll && failedAny) return false

  return passedAny
}