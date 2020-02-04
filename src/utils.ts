import { Config } from "./types"
import { getDefaultConfig } from "./defaults"
import produce from "immer"

// get storage using promise.
export function getStorage(): Promise<any> {
  return new Promise((res, rej) => {
    chrome.storage.local.get(items => {
      if (chrome.runtime.lastError) {
        rej(chrome.runtime.lastError)
      } else {
        res(items)
      }
      return 
    })
  })
}

export async function getConfig(): Promise<Config> {
  const storage = await getStorage()
  return storage["config"]
}

export async function getConfigOrDefault(): Promise<Config> {
  return (await getConfig()) || getDefaultConfig()
}

export function persistConfig(config: Config) {
  return new Promise((res, rej) => {
    chrome.storage.local.set({config}, () => {
      res()
    })
  })
}

export async function persistSpeed(config: Config, newSpeed: number, tabId: number) {
  newSpeed = conformSpeed(newSpeed)
  let pin = getPin(config, tabId)
  let newConfig: Config 
  if (pin) {
    newConfig = produce(config, d => {
      getPin(d, tabId).speed = newSpeed
    })
  } else {
    newConfig = produce(config, d => {
      d.speed = newSpeed
    })
  }
  await persistConfig(newConfig)
}

export function getPin(config: Config, tabId: number) {
  return config?.pins.find(v => v.tabId === tabId)
}

export async function togglePin(config: Config, tabId: number) {
  let pin = getPin(config, tabId)
  if (pin) {
    await clearPin(config, tabId)
  } else {
    await setPin(config, tabId)
  }
}

export async function setPin(config: Config, tabId: number) {
  const anchorSpeed = getSpeed(config, tabId)
  await persistConfig(produce(config, d => {
    d.pins = d.pins.filter(v => v.tabId !== tabId)
    d.pins.push({
      tabId: tabId,
      speed: anchorSpeed
    })
  }))
}

async function clearPin(config: Config, tabId: number) {
  await persistConfig(produce(config, d => {
    d.pins = d.pins.filter(v => v.tabId !== tabId)
  }))
}

export function getSpeed(config: Config, tabId: number) {
  let pin = getPin(config, tabId)
  return pin ? pin.speed : config.speed
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

// set badge text.
export function setBadgeText(text: string, tabId: number, color = "#a64646") {
  chrome.browserAction.setBadgeText({
    text,
    tabId
  })
  chrome.browserAction.setBadgeBackgroundColor({
    color,
    tabId
  }) 
}

export function getActiveTabIds(): Promise<number[]> {
  return new Promise((res, rej) => {
    chrome.tabs.query({active: true, currentWindow: undefined, windowType: "normal"}, tabs => {
      res(tabs.map(v => v.id)) 
    })
  })
}

export function getActiveTabId(): Promise<number> {
  return new Promise((res, rej) => {
    chrome.tabs.query({active: true, currentWindow: true, windowType: "normal"}, tabs => {
      res(tabs[0]?.id)
    })
  })
}

export function requestTabId(): Promise<number> {
  return new Promise((res, rej) => {
    chrome.runtime.sendMessage({
      type: "REQUEST_TAB_ID"
    }, id => {
      res(id)
    })
  })
}

export async function clearPins() {
  let storage = await getStorage()
  if (storage.config?.pins?.length > 0) {
    const newConfig = produce(storage.config as Config, d => {
      d.pins = []
    })
    chrome.storage.local.set({config: newConfig})
  }
}

export async function updateBadges() {
  const config = await getConfigOrDefault()
  const tabIds = await getActiveTabIds()

  // set universal badge text. 
  setBadgeText(formatSpeedForBadge(config.speed, false), undefined)

  // override for each active tab.
  for (let tabId of tabIds) {
    const speed = getSpeed(config, tabId)
    const isPinned = !!getPin(config, tabId)
    setBadgeText(formatSpeedForBadge(speed, isPinned), tabId)
  }
}

export async function migrateSchema() {
  let storage = await getStorage()
  let config = storage.config as Config
  const defaultConfig = getDefaultConfig()

  // since extension is getting more complex; I added a "config" object to represent all the options/state. 
  // extension version 1.x used a speed property directly on local storage; need to move it under "config". 
  if (!config && storage.speed) {
    config = {...getDefaultConfig(), speed: storage.speed}
  }
  
  config = {...defaultConfig, ...config, version: defaultConfig.version}
  chrome.storage.local.set({config, speed: undefined})
}


// round to nearest step.
export function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step
}

export function clamp(min: number, max: number, value: number) {
  return Math.min(max, Math.max(min, value))
}

export function round(value: number, precision: number): number {
	const scalar = 10 ** precision
	return Math.round(value * scalar) / scalar
}