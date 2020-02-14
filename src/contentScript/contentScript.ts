
import 'regenerator-runtime/runtime'
import { requestSenderInfo, requestCreateTab } from "../utils/browserUtils"
import { getConfigOrDefault, getContext, getPin, formatSpeed, conformSpeed, formatFilters, getTargetSets, resetFx, flipFx, setFx, setPin, persistConfig } from "../utils/configUtils"
import { checkIfMedia, setMediaCurrentTime, setMediaSpeed, setMediaPause, setMediaMute, setMark, seekMark, setElemFilter, clearElemFilter } from "./utils"
import { clamp, round } from '../utils/helper'
import { ShadowHost } from "./ShadowHost"
import { compareHotkeys, extractHotkey } from '../utils/keys'
import { Context, KeyBind, Pin, Config } from '../types'
import { CommandName } from "../defaults/commands"
import { filterInfos } from '../defaults/filters'
import produce from 'immer'


let shadowHost: ShadowHost
let intervalId: number 
let greedyKeys: KeyBind[]
let isRecursive: boolean
let enabled = true  

main()

// Chrome orphans contentScripts. Need to listen to a disconnect event for cleanup. 
const port = chrome.runtime.connect({name: "contentScript"})
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

  let config = await getConfigOrDefault()
  let {tabId} = await requestSenderInfo()
  let ctx = getContext(config, tabId)

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
    
    config = produce(config, dConfig => {
      const dPin = getPin(dConfig, tabId)
      const dCtx = getContext(dConfig, tabId)
      const dKeybind = dConfig.keybinds.find(v => v.id === keyBind.id)
      commandHandlers[keyBind.command](dKeybind, dConfig, tabId, dPin, dCtx)
    })
  }
  persistConfig(config)
}

const commandHandlers: {
  [key in CommandName]: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) => void
} = {
  nothing: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    
  },
  adjustSpeed: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    ctx.speed = conformSpeed(ctx.speed + (keyBind.valueNumber ?? 0.1))

    if (!config.hideIndicator) {
      shadowHost.show(formatSpeed(ctx.speed, !!pin))
    }
  },
  setSpeed: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    ctx.speed = conformSpeed(keyBind.valueNumber ?? 1.0)
  
    if (!config.hideIndicator) {
      shadowHost.show(formatSpeed(ctx.speed, !!pin))
    }
  },
  setPin: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    setPin(config, keyBind.valueState, tabId)
    if (!config.hideIndicator) {
      const pin = getPin(config, tabId)
      const ctx = getContext(config, tabId)
      shadowHost.show(formatSpeed(ctx.speed, !!pin))
    }
  },
  setRecursive: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    const state = keyBind.valueState
    ctx.recursive = state === "toggle" ? !ctx.recursive : state === "on" ? true : false 

    if (!config.hideIndicator) {
      shadowHost.showSmall(ctx.recursive ? "recursive on" : "recursive off")
    }
  },
  setState: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    const state = keyBind.valueState
    ctx.enabled = state === "toggle" ? !ctx.enabled : state === "on" ? true : false 
      
    if (!config.hideIndicator) {
      shadowHost.showSmall(ctx.enabled ? "on" : "off")
    }
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
    setFx(keyBind.filterTarget, keyBind.valueState, ctx)
    shadowHost.showSmall(`${ctx.elementFx ? "on" : "off"} / ${ctx.backdropFx ? "on" : "off"}`)
  },
  resetFx: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    resetFx(keyBind.filterTarget, ctx)
  },
  flipFx: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    flipFx(ctx)
  },
  adjustFilter: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    const filterInfo = filterInfos[keyBind.filterOption]

    setFx(keyBind.filterTarget, "on", ctx)
    const sets = getTargetSets(keyBind.filterTarget, ctx)

    for (let set of sets) {
      const fValue = set.find(v => v.filter === keyBind.filterOption)
      let newValue = clamp(filterInfo.min, filterInfo.max, fValue.value + (keyBind.valueNumber ?? filterInfo.largeStep))
      fValue.value = newValue
      shadowHost.showSmall(`${filterInfo.name} = ${round(newValue, 2)}`)
    }
  },
  setFilter: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    const filterInfo = filterInfos[keyBind.filterOption]

    setFx(keyBind.filterTarget, "on", ctx)
    const sets = getTargetSets(keyBind.filterTarget, ctx)
    for (let set of sets) {
      const fValue = set.find(v => v.filter === keyBind.filterOption)
      const newValue = clamp(filterInfo.min, filterInfo.max, keyBind.valueNumber ?? filterInfo.default)
      fValue.value = newValue
      shadowHost.showSmall(`${filterInfo.name} = ${round(newValue, 2)}`)
    }
  },
  cycleFilterValue: async function (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context) {
    const filterInfo = filterInfos[keyBind.filterOption]
    
    let newIncrement = (keyBind.cycleIncrement ?? 0) + 1 
    let cycle = (keyBind.valueCycle == null || keyBind.valueCycle.length === 0) ? [0, 1] : keyBind.valueCycle 
    let newValue = clamp(filterInfo.min, filterInfo.max, cycle[newIncrement % cycle.length])

    keyBind.cycleIncrement = newIncrement
    
    setFx(keyBind.filterTarget, "on", ctx)
    const sets = getTargetSets(keyBind.filterTarget, ctx)

    for (let set of sets) {
      const fValue = set.find(v => v.filter === keyBind.filterOption)
      fValue.value = newValue 
      shadowHost.showSmall(`${filterInfo.name} = ${round(newValue, 2)}`)
    }
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