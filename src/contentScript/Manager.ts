
import { requestSenderInfo, requestCreateTab, StorageChanges } from "../utils/browserUtils"
import { getConfigOrDefault, getContext, getPin, formatSpeed, conformSpeed, formatFilters, getTargetSets, resetFx, flipFx, setFx, setPin, persistConfig } from "../utils/configUtils"
import { seekMedia, setMediaPause, setMediaMute, setMark, seekMark, setElemFilter, clearElemFilter, clearElemTransform, setElemTransform, setDocumentTransform, clearDocumentTransform, setPlaybackRate } from "./utils"
import { clamp, round } from '../utils/helper'
import { ShadowHost } from "./ShadowHost"
import { compareHotkeys, extractHotkey } from '../utils/keys'
import { Context, KeyBind, Pin, Config } from '../types'
import { CommandName } from "../defaults/commands"
import { filterInfos } from '../defaults/filters'
import { LazyQuery } from './LazyQuery'
import { PollQuery } from './PollQuery'

export class Manager {
  shadowHost = new ShadowHost() 
  config: Config
  tabId: number 
  intervalId: number
  mediaQuery: LazyQuery<HTMLMediaElement> | PollQuery<HTMLMediaElement>
  fxQuery: LazyQuery<HTMLElement> | PollQuery<HTMLElement>
  released = false 
  constructor() {
    this.startup()
  }
  async startup() {
    this.tabId = (await requestSenderInfo()).tabId
    this.config = await getConfigOrDefault()
    this.handleConfigChange()
    chrome.storage.onChanged.addListener(this.handleStorageChange)
    window.addEventListener("keydown", this.handleKeyDown)
    window.addEventListener("keydown", this.handleKeyDownGreedy, true)
  }
  release() {
    if (this.released) return 
    this.released = true 
    
    this.shadowHost?.release()
    delete this.shadowHost

    this.suspend()
    chrome.storage.onChanged.removeListener(this.handleStorageChange)
    window.removeEventListener("keydown", this.handleKeyDown)
    window.removeEventListener("keydown", this.handleKeyDownGreedy, true)
  }
  suspend = () => {
    clearInterval(this.intervalId)
    this.mediaQuery?.release()
    delete this.mediaQuery

    this.shadowHost?.hideBackdrop()
    clearElemFilter()
    this.fxQuery?.release()
    delete this.fxQuery
  }
  handleStorageChange = async (changes: StorageChanges) => {
    const newConfig = changes?.config?.newValue
    if (!newConfig) return 
    this.config = newConfig
    this.handleConfigChange()
  }
  handleConfigChange = () => {
    const ctx = getContext(this.config, this.tabId)
    if (!ctx.enabled) {
      this.suspend() 
      return 
    }
    
    if (this.intervalId == null) {
      this.intervalId = setInterval(this.updatePage, 1000)
    }
    this.mediaQuery = this.mediaQuery || (this.config.usePolling ? new PollQuery("video, audio", this.config.pollRate ?? 1E3) : new LazyQuery("video, audio"))

    

    const elemFilter = formatFilters(ctx.elementFilterValues)
    if (ctx.elementFx && (elemFilter || ctx.elementFlipX || ctx.elementFlipY)) {
      const query = ctx.elementQuery || "video"
      this.fxQuery = this.fxQuery || (this.config.usePolling ? new PollQuery(query, this.config.pollRate ?? 1E3) : new LazyQuery(query))
      this.fxQuery.setQuery(query)
    } else {
      this.fxQuery?.release()
      delete this.fxQuery
    }

    this.updatePage()
  }
  updatePage = () => {
    const ctx = getContext(this.config, this.tabId)
    if (!ctx.enabled) {
      return 
    }

    // speed 
    this.mediaQuery?.elems.forEach(elem => {
      setPlaybackRate(elem, ctx.speed)
    })

    window.postMessage({type: "GS_SET_PLAYBACK_RATE", value: ctx.speed}, "*")

    // elem filter 
    const elemFilter = formatFilters(ctx.elementFilterValues)
    if (ctx.elementFx && elemFilter) {
      setElemFilter(this.fxQuery?.elems || [], elemFilter)
    } else {
      clearElemFilter()
    }

    if (ctx.elementFx && (ctx.elementFlipX || ctx.elementFlipY)) {
      setElemTransform(this.fxQuery?.elems || [], ctx.elementFlipX, ctx.elementFlipY)
    } else {
      clearElemTransform()
    }

    // backdrop filter 
    const backdropFilter = formatFilters(ctx.backdropFilterValues)
    if (ctx.backdropFx && backdropFilter) {
      this.shadowHost?.showBackdrop(backdropFilter)
    } else {
      this.shadowHost?.hideBackdrop()
    }

    if (ctx.backdropFx && ctx.backdropFlipX) {
      setDocumentTransform()
    } else {
      clearDocumentTransform()
    }
  }
  handleKeyDownGreedy = (e: KeyboardEvent) => {
    // stop if input fields 
    const target = e.target as HTMLElement
    if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) {
      return 
    }
    
    const ctx = getContext(this.config, this.tabId)
    let pageHasMedia = this.mediaQuery?.elems.length > 0 
    const greedyKeyBinds = this.config.keybinds.filter(v => v.greedy)
    const eventHotkey = extractHotkey(e)
    
    let validKeyBinds = ctx.enabled ? greedyKeyBinds : greedyKeyBinds.filter(v => v.command === "setState")
    if (validKeyBinds.some(v => (v.ifMedia ? pageHasMedia : true) && compareHotkeys(v.key, eventHotkey))) {
      e.preventDefault()
      e.stopImmediatePropagation()
      this.handleKeyDown(e)
    }
  }
  handleKeyDown = async (e: KeyboardEvent) => {
    // stop If input field 
    const target = e.target as HTMLElement
    if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) {
      return 
    }
  
    const eventHotkey = extractHotkey(e)
    e = null
  
    let ctx = getContext(this.config, this.tabId)
    let pageHasMedia = this.mediaQuery?.elems.length > 0
  
    // if extension is suspended, only listen to "toggleState" hotkeys. 
    let keyBinds = ctx.enabled ? this.config.keybinds : this.config.keybinds.filter(v => v.command === "setState")
  
    let flags = {changed: false}
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
      
      const pin = getPin(this.config, this.tabId)
      const ctx = getContext(this.config, this.tabId)
      const _keyBind = this.config.keybinds.find(v => v.id === keyBind.id)
      this.commandHandlers[_keyBind.command](_keyBind, this.config, this.tabId, pin, ctx, flags)
    }

    if (flags.changed) {
      persistConfig(this.config)
    }
  }


  commandHandlers: {
    [key in CommandName]: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => void
  } = {
    nothing: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      
    },
    adjustSpeed: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      ctx.speed = conformSpeed(ctx.speed + (keyBind.valueNumber ?? 0.1))
      flags.changed = true 

      if (!config.hideIndicator) {
        this.shadowHost?.show(formatSpeed(ctx.speed, !!pin))
      }
    },
    setSpeed: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      ctx.speed = conformSpeed(keyBind.valueNumber ?? 1.0)
      flags.changed = true 
    
      if (!config.hideIndicator) {
        this.shadowHost?.show(formatSpeed(ctx.speed, !!pin))
      }
    },
    setPin: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      setPin(config, keyBind.valueState, tabId)
      flags.changed = true 
      if (!config.hideIndicator) {
        const pin = getPin(config, tabId)
        const ctx = getContext(config, tabId)
        this.shadowHost?.show(formatSpeed(ctx.speed, !!pin))
      }
    },
    setState: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      const state = keyBind.valueState
      ctx.enabled = state === "toggle" ? !ctx.enabled : state === "on" ? true : false 
      flags.changed = true 
        
      if (!config.hideIndicator) {
        this.shadowHost?.showSmall(ctx.enabled ? "on" : "off")
      }
    },
    seek: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      const elems = this.mediaQuery.elems.filter(v => v.isConnected && v.readyState)
      const value = keyBind.valueNumber ?? 10
      elems.forEach(elem => seekMedia(elem, value, true))
      window.postMessage({type: "GS_SEEK", value: value, relative: true}, "*")

      if (value > 0) {
        this.shadowHost?.show(`>>`)  
      } else if (value < 0) {
        this.shadowHost?.show(`<<`)  
      }
    },
    setPause: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      const elems = this.mediaQuery.elems.filter(v => v.isConnected && v.readyState)
      elems.forEach(elem => setMediaPause(elem, keyBind.valueState))
      window.postMessage({type: "GS_SET_PAUSE", state: keyBind.valueState}, "*")

      this.shadowHost?.showSmall(`${keyBind.valueState} pause`)
    },
    setMute: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      const elems = this.mediaQuery.elems.filter(v => v.isConnected && v.readyState)
      elems.forEach(elem => setMediaMute(elem, keyBind.valueState))
      window.postMessage({type: "GS_SET_MUTE", state: keyBind.valueState}, "*")

      this.shadowHost?.showSmall(`${keyBind.valueState} mute`)
    },
    setMark: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      const elems = this.mediaQuery.elems.filter(v => v.isConnected && v.readyState)
      elems.forEach(elem => setMark(elem, keyBind.valueString))
      window.postMessage({type: "GS_SET_MARK", key: keyBind.valueString}, "*")
      
      this.shadowHost?.showSmall(`set "${keyBind.valueString}"`)
    },
    seekMark: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      const elems = this.mediaQuery.elems.filter(v => v.isConnected && v.readyState)
      elems.forEach(elem => seekMark(elem, keyBind.valueString))
      window.postMessage({type: "GS_SEEK_MARK", key: keyBind.valueString}, "*")

      this.shadowHost?.showSmall(`seek "${keyBind.valueString}"`)
    },
    openUrl: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      requestCreateTab(keyBind.valueString)
    },
    setFx: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      setFx(keyBind.filterTarget, keyBind.valueState, ctx)
      flags.changed = true 
      this.shadowHost?.showSmall(`${ctx.elementFx ? "on" : "off"} / ${ctx.backdropFx ? "on" : "off"}`)
    },
    resetFx: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      resetFx(keyBind.filterTarget, ctx)
      flags.changed = true 
    },
    flipFx: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      flipFx(ctx)
      flags.changed = true 
    },
    adjustFilter: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      const filterInfo = filterInfos[keyBind.filterOption]

      setFx(keyBind.filterTarget, "on", ctx)
      const sets = getTargetSets(keyBind.filterTarget, ctx)

      for (let set of sets) {
        const fValue = set.find(v => v.filter === keyBind.filterOption)
        let newValue = clamp(filterInfo.min, filterInfo.max, fValue.value + (keyBind.valueNumber ?? filterInfo.largeStep))
        fValue.value = newValue
        this.shadowHost?.showSmall(`${filterInfo.name} = ${round(newValue, 2)}`)
      }
      flags.changed = true 
    },
    setFilter: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      const filterInfo = filterInfos[keyBind.filterOption]

      setFx(keyBind.filterTarget, "on", ctx)
      const sets = getTargetSets(keyBind.filterTarget, ctx)
      for (let set of sets) {
        const fValue = set.find(v => v.filter === keyBind.filterOption)
        const newValue = clamp(filterInfo.min, filterInfo.max, keyBind.valueNumber ?? filterInfo.default)
        fValue.value = newValue
        this.shadowHost?.showSmall(`${filterInfo.name} = ${round(newValue, 2)}`)
      }

      flags.changed = true 
    },
    cycleFilterValue: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
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
        this.shadowHost?.showSmall(`${filterInfo.name} = ${round(newValue, 2)}`)
      }

      flags.changed = true 
    }
  }
}