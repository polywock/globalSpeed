import { AdjustMode, Duration, KeybindMatch, ReferenceValues, SvgFilter, Trigger, type FilterEntry, type Keybind, type TargetFx, type TargetFxFlags, type URLCondition, type URLConditionPart } from "../types";
import { clamp, isFirefox, round } from "./helper";
import { filterInfos } from "../defaults/filters";
import type { MediaEvent } from "../contentScript/isolated/utils/applyMediaEvent";
import { Hotkey, compareHotkeys } from "./keys";
import { SVG_FILTER_ADDITIONAL } from "src/defaults/svgFilterAdditional"
import { svgFilterIsValid } from "src/defaults/filters"



export function conformSpeed(speed: number, rounding = 2) {
  return clamp(0.07, 16, round(speed, rounding))
}

export function formatSpeedOld(speed: number) {
  return speed.toFixed(2)
}

export function formatSpeed(speed: number, snip = false) {
  let speedString = speed.toFixed(2) 
  if (snip && speedString.at(-1) === "0") {
    speedString = speedString.slice(0, -1)
  }
  return speedString
}

export function formatSpeedForBadge(speed: number) {
  return formatSpeed(speed).slice(0, isFirefox() ? 3 : 4)
}

export function formatFilters(filterValues: FilterEntry[]) {
  let parts: string[] = []
  filterValues?.forEach(v => {
    const filterInfo = filterInfos[v.name]
    if (v.value != null && v.value !== filterInfo.ref.default) {
      parts.push(filterInfo.format(v.value))
    }
  })
  return parts.join(" ")
}

export function hasActiveSvgFilters(filters: SvgFilter[]) {
  if (filters?.filter(f => {
    if (!f.enabled) return 
    const typeInfo = SVG_FILTER_ADDITIONAL[f.type]
    if (svgFilterIsValid(f, typeInfo.isValid)) return true 
  }).length) return true 
}

export function checkFilterDeviation(values: FilterEntry[]) {
  for (let v of (values || [])) {
    const filterInfo = filterInfos[v.name]
    if (v.value != null && v.value !== filterInfo.ref.default) {
      return true  
    }
  }
}

export function checkFilterDeviationOrActiveSvg(filters: FilterEntry[], svgFilters: SvgFilter[]) {
  return checkFilterDeviation(filters) || hasActiveSvgFilters(svgFilters)
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
  if (gvar?.tabInfo?.tabId === tabId && gvar.tabInfo.frameId === frameId) {
    // realizeMediaEvent(key, event)
  } else {}
  chrome.tabs.sendMessage(tabId, {type: "APPLY_MEDIA_EVENT", event, key}, frameId == null ? undefined : {frameId})
}

export function sendMessageToConfigSync(msg: any, tabId: number, frameId?: number) {
  chrome.tabs.sendMessage(tabId, msg, frameId == null ? undefined : {frameId})
}

export function testURLWithPart(url: string, p: URLConditionPart) {
  if (p.type === "STARTS_WITH") {
    return url.startsWith(p.valueStartsWith)
  } else if (p.type === "CONTAINS") {
    return url.includes(p.valueContains)
  } else if (p.type === "REGEX") {
    try {
      return new RegExp(p.valueRegex).test(url)
    } catch (err) {}
  } 
}

export function getSelectedParts(c: URLCondition) {
  return (c?.block ? c?.blockParts : c?.allowParts) || []
}

export function getActiveParts(c: URLCondition) {
  return getSelectedParts(c).filter(p => !p.disabled)
}

export function hasActiveParts(c: URLCondition) {
  return getActiveParts(c).length > 0
}

export function testURL(url: string, c: URLCondition, neutral?: boolean) {
  const parts = getActiveParts(c)
  if (!parts.length) return neutral
  const matched = parts.some(p => testURLWithPart(url, p))
  return c.block ? !matched : matched
}


export function extractURLPartValueKey(part: URLConditionPart): "valueContains" | "valueStartsWith" | "valueRegex" {
  return (part.type === "CONTAINS" ? "valueContains" : (part.type === "STARTS_WITH" ? "valueStartsWith" : "valueRegex"))
}

export function requestSyncContextMenu(direct?: boolean) {
  chrome.runtime.sendMessage({type: "SYNC_CONTEXT_MENUS", direct})
}

export function isSeekSmall(kb: Keybind, ref?: ReferenceValues) {
  if (kb.adjustMode === AdjustMode.ADD) {
    let val = kb.valueNumber ?? ref?.step
    if ((kb.duration || Duration.SECS) === Duration.SECS) return Math.abs(val) < 0.5
    if (kb.duration === Duration.FRAMES) return Math.abs(val) < 14
  }
}

export function findMatchingKeybindsLocal(kbs: Keybind[], key?: Hotkey): KeybindMatch[] {
  return kbs.filter(kb => kb.enabled && (kb.trigger || Trigger.LOCAL) === Trigger.LOCAL).map(kb => {
    if (kb.key && compareHotkeys(kb.key, key)) return {kb}
    if (kb.allowAlt && kb.adjustMode === AdjustMode.CYCLE && compareHotkeys(kb.keyAlt, key)) return {kb, alt: true}
  }).filter(v => v)
}

export function findMatchingKeybindsGlobal(kbs: Keybind[], global?: string): KeybindMatch[] {
  return kbs.filter(kb => kb.enabled && kb.trigger === Trigger.GLOBAL).map(kb => {
    if ((kb.globalKey || 'commandA') === global) return {kb}
    if (kb.allowAlt && kb.adjustMode === AdjustMode.CYCLE && (kb.globalKeyAlt || 'commandA') === global) return {kb, alt: true}
  }).filter(v => v)
}

export function findMatchingKeybindsContext(kbs: Keybind[], id: string): KeybindMatch[] {
  return kbs.filter(kb => kb.enabled && kb.trigger === Trigger.CONTEXT).map(kb => {
    if (kb.id === id) return {kb}
    if (kb.allowAlt && kb.adjustMode === AdjustMode.CYCLE && `ALT_${kb.id}` === id) return {kb, alt: true}
  }).filter(v => v)
}


