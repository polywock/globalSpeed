import { Config, Context, FilterValue, FilterTarget, SetState } from "../types";
import { getDefaultConfig, standardIcons, grayscaleIcons } from "../defaults";
import { setBadgeText, getActiveTabIds, setBadgeIcon, getStorage, setStorage } from "./browserUtils";
import { clamp, round } from "./helper";
import { filterInfos, getDefaultFilterValues, FilterName } from "../defaults/filters";
import cloneDeep from "lodash.clonedeep"

export async function getConfig(): Promise<Config> {
  const storage = await getStorage()
  return storage["config"]
}

export async function getConfigOrDefault(): Promise<Config> {
  return (await getConfig()) || getDefaultConfig()
}


export function persistConfig(config: Config) {
  return setStorage({config})
}

export function getPin(config: Config, tabId: number) {
  return config.pins.find(v => v.tabId === tabId)
}
export function setPin(config: Config, state: SetState, tabId: number) {
  let pin = getPin(config, tabId)
  if (state === "off" || (state === "toggle" && pin)) {
    config.pins = config.pins.filter(pin => pin.tabId !== tabId)
  } else if (!pin) {
    config.pins.push({
      tabId: tabId,
      ctx: cloneDeep(config.common)
    })
  }
}


export function getContext(config: Config, tabId: number) {
  const pin = getPin(config, tabId)
  return pin?.ctx || config.common
}

export async function startupCleanUp() {
  let config = await getConfigOrDefault()
  if (config.pins?.length > 0) {
    config.pins = []
  }
  persistConfig(config)
}

export async function updateBadges() {
  const config = await getConfigOrDefault()
  const tabIds = await getActiveTabIds()

  // set global badge text. 
  if (config.hideBadge || !config.common.enabled) {
    setBadgeText("", null)
  } else {
    setBadgeText(formatSpeedForBadge(config.common.speed, false), undefined)
  }

  // set global icon.
  if (config.common.enabled) {
    setBadgeIcon(standardIcons)
  } else {
    setBadgeIcon(grayscaleIcons)
  }

  // override for each active tab.
  for (let tabId of tabIds) {
    const isPinned = !!getPin(config, tabId)
    const ctx = getContext(config, tabId)

    if (config.hideBadge || !ctx.enabled) {
      setBadgeText("", tabId)
    } else {
      setBadgeText(formatSpeedForBadge(ctx.speed, isPinned), tabId)
    }

    setBadgeIcon(ctx.enabled ? standardIcons : grayscaleIcons, tabId)
  }
}

export function conformSpeed(speed: number) {
  return clamp(0.07, 16, round(speed, 2))
}

export function formatSpeed(speed: number, isPinned: boolean) {
  return `${speed.toFixed(2)}${isPinned ? "i" : ""}`
}

export function formatSpeedForBadge(speed: number, isPinned: boolean) {
  return `${speed.toFixed(2).slice(0, 4)}${isPinned ? "i" : ""}`
}

export function formatFilters(filterValues: FilterValue[]) {
  let parts: string[] = []
  filterValues.forEach(v => {
    const filterInfo = filterInfos[v.filter]
    if (v.value != null && v.value !== filterInfo.default) {
      parts.push(filterInfo.format(v.value))
    }
  })
  return parts.join(" ")
}

export function getTargetSets(target: FilterTarget, ctx: Context) {
  const targetSets: FilterValue[][] = [] 
  if (target === "backdrop" || target === "both" || (target === "enabled" && ctx.backdropFx)) {
    targetSets.push(ctx.backdropFilterValues);
  }
  if (target === "element" || target === "both" || (target === "enabled" && ctx.elementFx)) {
    targetSets.push(ctx.elementFilterValues);
  }
  return targetSets 
}

export function resetFx(target: FilterTarget, ctx: Context) {
  if (target === "backdrop" || target === "both" || (target === "enabled" && ctx.backdropFx)) {
    ctx.backdropFilterValues = getDefaultFilterValues()
    ctx.backdropFx = false
  }
  if (target === "element" || target === "both" || (target === "enabled" && ctx.elementFx)) {
    ctx.elementFilterValues = getDefaultFilterValues()
    ctx.elementFx = false
    delete ctx.elementQuery
  }
}

export function flipFx(ctx: Context) {
  let backdropVals = ctx.backdropFilterValues
  let backdropFx = ctx.backdropFx

  ctx.backdropFilterValues = ctx.elementFilterValues
  ctx.backdropFx = ctx.elementFx

  ctx.elementFilterValues = backdropVals
  ctx.elementFx = backdropFx
}

export function copyInto(backdropTab: boolean, ctx: Context) {
  if (backdropTab) {
    ctx.backdropFilterValues = ctx.elementFilterValues
    ctx.backdropFx = ctx.elementFx
  } else {
    ctx.elementFilterValues = ctx.backdropFilterValues
    ctx.elementFx = ctx.backdropFx
  }
}


export function setFx(target: FilterTarget, state: SetState, ctx: Context) {
  if (target === "backdrop" || target === "both" || (target === "enabled" && ctx.backdropFx)) {
    ctx.backdropFx = state === "toggle" ? !ctx.backdropFx : state === "on" ? true : false 
  }
  if (target === "element" || target === "both" || (target === "enabled" && ctx.elementFx)) {
    ctx.elementFx = state === "toggle" ? !ctx.elementFx : state === "on" ? true : false 
  }
}

export function moveFilter(target: FilterTarget, filterName: FilterName, ctx: Context, down: boolean) {
  for (let set of getTargetSets(target, ctx)) {
      let filterIdx = set.findIndex(v => v.filter === filterName)
      let filterVal = set[filterIdx]
      let newFilterIdx = clamp(0, set.length - 1, filterIdx + (down ? 1 : -1))
      set.splice(filterIdx, 1)
      set.splice(newFilterIdx, 0, filterVal)
  }
}
  
