
import 'regenerator-runtime/runtime'
import { requestSenderInfo, requestCreateTab } from "../utils/browserUtils"
import { getConfigOrDefault, getContext, setContext, getPin, togglePin, clearPin, formatSpeed, conformSpeed, formatFilters, getTargetSets, resetFx, flipFx, setFx, setPin } from "../utils/configUtils"
import { checkIfMedia, setMediaCurrentTime, setMediaSpeed, setMediaPause, setMediaMute, setMark, seekMark, setElemFilter, clearElemFilter } from "./utils"
import { roundToStep, clamp } from '../utils/helper'
import { ShadowHost } from "./ShadowHost"
import { compareHotkeys, extractHotkey, Hotkey } from '../utils/keys'
import produce from 'immer'
import { Context, KeyBind, Pin, Config } from '../types'
import { CommandName } from "../defaults/commands"
import { filterInfos } from '../defaults/filters'


let shadowHost: ShadowHost
let intervalId: number 
let greedyKeys: KeyBind[]
let isRecursive: boolean
let enabled = true  

main()

// Chrome orphans contentScripts. Need to listen to a disconnect event for cleanup. 
const port = chrome.runtime.connect()
port.onDisconnect.addListener(() => {
  cleanUp()
})

async function main() {
  shadowHost = new ShadowHost() 
  chrome.storage.onChanged.addListener(handleInterval)
  handleInterval() 
  intervalId = setInterval(handleInterval, 300)
  window.addEventListener("keydown", handleKeyDown)
  window.addEventListener("keydown", handleKeyDownGreedy, true)

  document.body.appendChild(shadowHost.wrapper);
}


function cleanUp() {
  clearInterval(intervalId) 
  window.removeEventListener("keydown", handleKeyDown)
  window.removeEventListener("keydown", handleKeyDownGreedy, true)
  if (shadowHost) {
    document.body.removeChild(shadowHost.wrapper)
  }
  
  shadowHost = undefined
  greedyKeys = undefined
  enabled = undefined
}


async function handleInterval(){
  const config = await getConfigOrDefault()
  const {tabId} = await requestSenderInfo()
  const ctx = getContext(config, tabId)

  // need this for reference for greedy key handler. 
  greedyKeys = config.keybinds.filter(v => v.greedy)
  isRecursive = ctx.recursive

  if (ctx.enabled) {
    enabled = true 
    if (intervalId == null) {
      intervalId = setInterval(handleInterval, 300)
    }
  } else {
    enabled = false 
    if (intervalId != null) {
      clearInterval(intervalId)
      intervalId = null
    }
    clearFilter(true)
    clearFilter(false)
    return 
  }

  setMediaSpeed(ctx.recursive, ctx.speed)

  
  
  if (ctx.elementFx) {
    const filter = formatFilters(ctx.elementFilterValues)
    setFilter(filter, false, ctx.recursive, ctx.elementQuery || "video")
  } else {
    clearFilter(false)
  }

  if (ctx.backdropFx) {
    const filter = formatFilters(ctx.backdropFilterValues)
    setFilter(filter, true, ctx.recursive)
  } else {
    clearFilter(true)
  }
}


function handleKeyDownGreedy(e: KeyboardEvent) {
  
  const target = e.target as HTMLElement
  if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) {
    return 
  }

  greedyKeys = greedyKeys || []
  const eventHotkey = extractHotkey(e)
  let validKeyBinds = enabled ? greedyKeys : greedyKeys.filter(v => v.command === "setState")
  let hasMedia = false 
  if (validKeyBinds.some(v => v.ifMedia)) {
    hasMedia = checkIfMedia(isRecursive)
  }
  if (validKeyBinds.some(v => (v.ifMedia ? hasMedia : true) && compareHotkeys(v.key, eventHotkey))) {
    e.preventDefault()
    e.stopImmediatePropagation()
    handleKeyDown(e)
  }
}


async function handleKeyDown(e: KeyboardEvent) {
  
  // stop If input field 
  const target = e.target as HTMLElement
  if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) {
    return 
  }

  const eventHotkey = extractHotkey(e)
  e = null

  const config = await getConfigOrDefault()
  const {tabId} = await requestSenderInfo()
  const pin = getPin(config, tabId)
  const ctx = getContext(config, tabId)

  // if extension is suspended, only listen to "toggleState" hotkeys. 
  let keyBinds = ctx.enabled ? config.keybinds : config.keybinds.filter(v => v.command === "setState")

  // only check if page has media if at least one enabled keyBind cares about it. 
  let pageHasMedia = false;
  if (keyBinds.some(keyBind => keyBind.enabled && keyBind.ifMedia)) {
    pageHasMedia = checkIfMedia(ctx.recursive) 
  }

  for (let keyBind of keyBinds) {
    if (!keyBind.enabled) {
      continue
    }
    if (!compareHotkeys(keyBind.key, eventHotkey)) {
      continue 
    }
    if (keyBind.ifMedia && !pageHasMedia) {
      continue
    }

    commandHandlers[keyBind.command](keyBind, config, tabId, pin, ctx)
  }
}

const commandHandlers: {
  [key in CommandName]: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) => void
} = {
  nothing: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    
  },
  adjustSpeed: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    const newSpeed = conformSpeed(roundToStep(ctx.speed + (keyBind.valueNumber ?? 0.1), keyBind.valueNumber ?? 0.1) )
    await setContext(config, produce(ctx, d => {
      d.speed = newSpeed
    }), tabId)
  
    if (!config.hideIndicator) {
      shadowHost.show(formatSpeed(newSpeed, !!pin))
    }
  },
  setSpeed: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    const newSpeed = conformSpeed(keyBind.valueNumber ?? 1.0)
    await setContext(config, produce(ctx, d => {
      d.speed = newSpeed
    }), tabId)
  
    if (!config.hideIndicator) {
      shadowHost.show(formatSpeed(newSpeed, !!pin))
    }
  },
  setPin: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    const state = keyBind.valueState
    let newCtx = ctx 
    let newIsPinned = !!pin 

    if (state === "off" || (state === "toggle" && pin)) {
      await clearPin(config, tabId)
      newCtx = config.common
      newIsPinned = false 
    } else {
      newIsPinned = true 
      if (!pin) {
        await setPin(config, tabId)
      }
    }
  
    if (!config.hideIndicator) {
      shadowHost.show(formatSpeed(newCtx.speed, newIsPinned))
    }
  },
  setRecursive: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    const state = keyBind.valueState
    await setContext(config, produce(ctx, d => {
      d.recursive = state === "toggle" ? !d.recursive : state === "on" ? true : false 

      if (!config.hideIndicator) {
        shadowHost.showSmall(d.recursive ? "recursive on" : "recursive off")
      }
    }), tabId)
  
  },
  setState: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    const state = keyBind.valueState
    await setContext(config, produce(ctx, d => {
      d.enabled = state === "toggle" ? !d.enabled : state === "on" ? true : false 
      
      if (!config.hideIndicator) {
        shadowHost.showSmall(d.enabled ? "on" : "off")
      }
    }), tabId)
  },
  seek: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    setMediaCurrentTime(ctx.recursive, keyBind.valueNumber ?? 10, true)
  },
  setPause: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    setMediaPause(ctx.recursive, keyBind.valueState)
  },
  setMute: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    setMediaMute(ctx.recursive, keyBind.valueState)
  },
  setMark: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    let marks = setMark(ctx.recursive, keyBind.valueString)
    if (marks.length === 0) {
      shadowHost.showSmall(`no media`)  
    } else {
      shadowHost.showSmall(`setting "${keyBind.valueString}"`)
    }
  },
  seekMark: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    let saughtMark = seekMark(ctx.recursive, keyBind.valueString)
    if (!saughtMark) {
      let marks = setMark(ctx.recursive, keyBind.valueString)
      if (marks.length === 0) {
        shadowHost.showSmall(`no media`)  
      } else {
        shadowHost.showSmall(`setting "${keyBind.valueString}"`)
      }
    }
  },
  openUrl: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    requestCreateTab(keyBind.valueString)
  },
  setFx: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    setContext(config, produce(ctx, d => {
      setFx(keyBind.filterTarget, keyBind.valueState, d)
      shadowHost.showSmall(`${d.elementFx ? "on" : "off"} / ${d.backdropFx ? "on" : "off"}`)
    }), tabId)
  },
  resetFx: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    setContext(config, produce(ctx, d => {
      resetFx(keyBind.filterTarget, d)
    }), tabId)
  },
  flipFx: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    setContext(config, produce(ctx, d => {
      flipFx(d)
    }), tabId)
  },
  adjustFilter: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    const filterInfo = filterInfos[keyBind.filterOption]

    setContext(config, produce(ctx, d => {
      setFx(keyBind.filterTarget, "on", d)
      const dSets = getTargetSets(keyBind.filterTarget, d)

      for (let dSet of dSets) {
        const fValue = dSet.find(v => v.filter === keyBind.filterOption)
        let newValue = clamp(filterInfo.min, filterInfo.max, fValue.value + (keyBind.valueNumber ?? filterInfo.largeStep))
        fValue.value = newValue
        shadowHost.showSmall(`${filterInfo.name} = ${newValue}`)
      }
    }), tabId)
  },
  setFilter: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    const filterInfo = filterInfos[keyBind.filterOption]

    setContext(config, produce(ctx, d => {
      setFx(keyBind.filterTarget, "on", d)
      const dSets = getTargetSets(keyBind.filterTarget, d)
      for (let dSet of dSets) {
        const fValue = dSet.find(v => v.filter === keyBind.filterOption)
        const newValue = clamp(filterInfo.min, filterInfo.max, keyBind.valueNumber ?? filterInfo.default)
        fValue.value = newValue
        shadowHost.showSmall(`${filterInfo.name} = ${newValue}`)
      }
    }), tabId)
  },
  cycleFilterValue: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    const filterInfo = filterInfos[keyBind.filterOption]
    
    let newIncrement = (keyBind.cycleIncrement ?? 0) + 1 
    let cycle = (keyBind.valueCycle == null || keyBind.valueCycle.length === 0) ? [0, 1] : keyBind.valueCycle 
    let newValue = clamp(filterInfo.min, filterInfo.max, cycle[newIncrement % cycle.length])

    

    config = produce(config, d => {
      const dKeyBind = d.keybinds.find(v => v.id === keyBind.id)
      dKeyBind.cycleIncrement = newIncrement
    })
    
    await setContext(config, produce(ctx, d => {
      setFx(keyBind.filterTarget, "on", d)
      const dSets = getTargetSets(keyBind.filterTarget, d)

      for (let dSet of dSets) {
        const fValue = dSet.find(v => v.filter === keyBind.filterOption)
        fValue.value = newValue 
        shadowHost.showSmall(`${filterInfo.name} = ${newValue}`)
      }
    }), tabId)
  }
}







function setFilter(filter: string, backdrop: boolean, recursive: boolean, query?: string) {
  if (backdrop) {
    shadowHost.showBackdrop(filter)
  } else {
    setElemFilter(recursive, filter, query)
  }
}

function clearFilter(backdrop: boolean) {
  if (backdrop) {
    shadowHost.hideBackdrop()
  } 
  if (!backdrop) {
    clearElemFilter()
  }
}