import { FilterEntry, TargetFx, TargetFxFlags, Fx, StateView, Gsm } from "../types";
import { clamp, round } from "./helper";
import { filterInfos, FilterName } from "../defaults/filters";
import { MediaEvent } from "../contentScript/utils/applyMediaEvent";


export function conformSpeed(speed: number) {
  return clamp(0.07, 16, round(speed, 2))
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

export function extractFx(flags: TargetFxFlags, view: StateView) {
  const sets: Fx[] = [] 
  if (flags.element) {
    sets.push(view.elementFx);
  }
  if (flags.backdrop) {
    sets.push(view.backdropFx);
  }
  return sets
}


export function setFilterValue(entries: FilterEntry[], name: FilterName, value: number, relative?: boolean) {
  const filterInfo = filterInfos[name]
  value = value ?? (relative ? filterInfo.step : filterInfo.default)
  const targetEntry = entries.find(v => v.name === name)
  targetEntry.value = clamp(filterInfo.min, filterInfo.max, relative ? targetEntry.value + value : value)
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


export function createFeedbackAudio(good = true) {
  return new Audio(chrome.runtime.getURL(`sounds/${good ? "good" : "bad"}.wav`))
}

