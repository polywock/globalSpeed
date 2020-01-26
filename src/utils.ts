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
  chrome.storage.local.set({config})
}

export function persistSpeed(config: Config, newSpeed: number, tabId: number) {
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
  persistConfig(newConfig)
}

export function getPin(config: Config, tabId: number) {
  return config?.pins.find(v => v.tabId === tabId)
}

export function togglePin(config: Config, tabId: number) {
  let pin = getPin(config, tabId)
  pin ? clearPin(config, tabId) : setPin(config, tabId)
}

function setPin(config: Config, tabId: number) {
  const anchorSpeed = getSpeed(config, tabId)
  persistConfig(produce(config, d => {
    d.pins = d.pins.filter(v => v.tabId !== tabId)
    d.pins.push({
      tabId: tabId,
      speed: anchorSpeed
    })
  }))
}

function clearPin(config: Config, tabId: number) {
  persistConfig(produce(config, d => {
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