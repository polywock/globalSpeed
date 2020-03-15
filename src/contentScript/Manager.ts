
import { requestSenderInfo, requestCreateTab, StorageChanges } from "../utils/browserUtils"
import { getConfigOrDefault, getContext, getPin, formatSpeed, conformSpeed, formatFilters, getTargetSets, resetFx, flipFx, setFx, setPin, persistConfig } from "../utils/configUtils"
import { setElemFilter, clearElemFilter, clearElemTransform, setElemTransform, setDocumentTransform, clearDocumentTransform, injectScript, MediaEventSeek, MediaEventPause, MediaEventMute, MediaEventSetMark, MediaEventSeekMark, MediaEventToggleLoop, applyMediaEvent, MediaEventPlaybackRate } from "./utils"
import { clamp, round } from '../utils/helper'
import { ShadowHost } from "./ShadowHost"
import { compareHotkeys, extractHotkey } from '../utils/keys'
import { Context, KeyBind, Pin, Config } from '../types'
import { CommandName, commandInfos } from "../defaults/commands"
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
  blockNext = false 
  constructor() {
    this.startup()
  }
  async startup() {
    this.tabId = (await requestSenderInfo()).tabId
    this.config = await getConfigOrDefault()
    this.handleConfigChange()
    chrome.storage.onChanged.addListener(this.handleStorageChange)
    chrome.runtime.onMessage.addListener(this.handleMessage)
    window.addEventListener("keydown", this.handleKeyDown)
    window.addEventListener("keydown", this.handleKeyDownGreedy, true)
    window.addEventListener("keyup", this.handleKeyUpGreedy, true)

    window.addEventListener("enterpictureinpicture", this.handleEnterPIP)
    window.addEventListener("leavepictureinpicture", this.handleLeavePIP)
  }
  release() {
    if (this.released) return 
    this.released = true 
    
    this.shadowHost?.release()
    delete this.shadowHost

    this.suspend()
    chrome.storage.onChanged.removeListener(this.handleStorageChange)
    chrome.runtime.onMessage.removeListener(this.handleMessage)
    window.removeEventListener("keydown", this.handleKeyDown)
    window.removeEventListener("keydown", this.handleKeyDownGreedy, true)
    window.removeEventListener("keyup", this.handleKeyUpGreedy, true)
    window.removeEventListener("enterpictureinpicture", this.handleEnterPIP)
    window.removeEventListener("leavepictureinpicture", this.handleLeavePIP)
  }
  suspend = () => {
    clearInterval(this.intervalId)
    this.mediaQuery?.release()
    delete this.mediaQuery

    clearElemTransform()
    clearDocumentTransform()

    this.shadowHost?.hideBackdrop()
    clearElemFilter()
    this.fxQuery?.release()
    delete this.fxQuery
  }
  handleEnterPIP = (e: Event) => {
    chrome.runtime.sendMessage({type: "PIP_ENTER"})
    window.pipMode = true
  }
  handleLeavePIP = (e: Event) => {
    chrome.runtime.sendMessage({type: "PIP_LEAVE"})
    delete window.pipMode
  }
  handleMessage = (msg: any) => {
    let pip = (document as any).pictureInPictureElement as HTMLVideoElement
    if (!pip) return 
    if (msg.type === "APPLY_MEDIA_EVENT") {
      applyMediaEvent([pip], msg.value)
    }
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
    const msg: MediaEventPlaybackRate = {type: "SET_PLAYBACK_RATE", value: ctx.speed}
    applyMediaEvent(this.mediaQuery?.elems || [], msg)
    window.postMessage({type: "GS_APPLY_MEDIA_EVENT", value: msg}, "*")

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
  handleKeyUpGreedy = (e: KeyboardEvent) => {
    if (this.blockNext) {
      e.stopImmediatePropagation()
      e.preventDefault()
      this.blockNext = false 
    }
  }
  handleKeyDownGreedy = (e: KeyboardEvent) => {
    this.blockNext = false 

    // stop if input fields 
    const target = e.target as HTMLElement
    if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) {
      return 
    }
    
    const ctx = getContext(this.config, this.tabId)
    let pageHasMedia = (this.mediaQuery?.elems.length > 0) || this.config.pipInfo
    const greedyKeyBinds = this.config.keybinds.filter(v => v.greedy)
    const eventHotkey = extractHotkey(e)
    
    let validKeyBinds = ctx.enabled ? greedyKeyBinds : greedyKeyBinds.filter(v => v.command === "setState")
    if (validKeyBinds.some(v => v.enabled && (!v.ifMedia || pageHasMedia) && compareHotkeys(v.key, eventHotkey))) {
      this.blockNext = true 
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
    let pageHasMedia = (this.mediaQuery?.elems.length > 0) || this.config.pipInfo


    let validKeybinds = ctx.enabled ? this.config.keybinds : this.config.keybinds.filter(v => v.command === "setState")
    validKeybinds = validKeybinds.filter(v => v.enabled && (!v.ifMedia || pageHasMedia) && compareHotkeys(v.key, eventHotkey))
    
  
    let flags = {changed: false}
    for (let keyBind of validKeybinds) {
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
    runCode: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      injectScript(keyBind.valueString)
      if (!config.hideIndicator) {
        this.shadowHost?.showSmall(window.gsm["command_runCode"] || "")
      }
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
        this.shadowHost?.showSmall(window.gsm[`token_${ctx.enabled ? "on" : "off"}`])
      }
    },
    seek: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      
      const value = keyBind.valueNumber ?? 10
      const msg: MediaEventSeek = {type: "SEEK", value: value, relative: true}

      if (config.pipInfo) {
        chrome.runtime.sendMessage({type: "PIP_FEED", msg})
      } else {
        const elems = this.mediaQuery.elems.filter(v => v.isConnected && v.readyState)
        applyMediaEvent(elems, msg)
        window.postMessage({type: "GS_APPLY_MEDIA_EVENT", value: msg}, "*")
      }

      if (!config.hideIndicator) {
        if (value > 0) {
          this.shadowHost?.show(`>>`)  
        } else if (value < 0) {
          this.shadowHost?.show(`<<`)  
        }
      }
    },
    setPause: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      const msg: MediaEventPause = {type: "PAUSE", state: keyBind.valueState}
      if (config.pipInfo) {
        chrome.runtime.sendMessage({type: "PIP_FEED", msg})
      } else {
        const elems = this.mediaQuery.elems.filter(v => v.isConnected && v.readyState)
        applyMediaEvent(elems, msg)
        window.postMessage({type: "GS_APPLY_MEDIA_EVENT", value: msg}, "*")
      }

      if (!config.hideIndicator) {
        this.shadowHost?.showSmall(`${window.gsm["token_pause"] || ""} = ${window.gsm[`token_${keyBind.valueState}`] || ""}`)
      }
    },
    setMute: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      const msg: MediaEventMute = {type: "MUTE", state: keyBind.valueState}
      if (config.pipInfo) {
        chrome.runtime.sendMessage({type: "PIP_FEED", msg})
      } else {
        const elems = this.mediaQuery.elems.filter(v => v.isConnected && v.readyState)
        applyMediaEvent(elems, msg)
        window.postMessage({type: "GS_APPLY_MEDIA_EVENT", value: msg}, "*")
      }

      if (!config.hideIndicator) {
        this.shadowHost?.showSmall(`${window.gsm["token_mute"] || ""} = ${window.gsm[`token_${keyBind.valueState}`] || ""}`)
      }
    },
    setMark: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      const key = keyBind.valueString.trim()
      const msg: MediaEventSetMark = {type: "SET_MARK", key}
      if (config.pipInfo) {
        chrome.runtime.sendMessage({type: "PIP_FEED", msg})
      } else {
        const elems = this.mediaQuery.elems.filter(v => v.isConnected && v.readyState)
        applyMediaEvent(elems, msg)
        window.postMessage({type: "GS_APPLY_MEDIA_EVENT", value: msg}, "*")
      }

      if (!config.hideIndicator) {
        this.shadowHost?.showSmall(`${window.gsm["token_setting"] || ""} "${key}"`)
      }
    },
    seekMark: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      const key = keyBind.valueString.trim()
      const msg: MediaEventSeekMark = {type: "SEEK_MARK", key}
      if (config.pipInfo) {
        chrome.runtime.sendMessage({type: "PIP_FEED", msg})
      } else {
        const elems = this.mediaQuery.elems.filter(v => v.isConnected && v.readyState)
        applyMediaEvent(elems, msg)
        window.postMessage({type: "GS_APPLY_MEDIA_EVENT", value: msg}, "*")
      }

      if (!config.hideIndicator) {
        this.shadowHost?.showSmall(`${window.gsm["token_goTo"] || ""} "${key}"`)
      }
    },
    toggleLoop: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      const key = keyBind.valueString.trim()
      const msg: MediaEventToggleLoop = {type: "TOGGLE_LOOP", key}
      if (config.pipInfo) {
        chrome.runtime.sendMessage({type: "PIP_FEED", msg})
      } else {
        const elems = this.mediaQuery.elems.filter(v => v.isConnected && v.readyState)
        applyMediaEvent(elems, msg)
        window.postMessage({type: "GS_APPLY_MEDIA_EVENT", value: msg}, "*")
      }

      if (!config.hideIndicator) {
        this.shadowHost?.showSmall(window.gsm[commandInfos.toggleLoop.name] || "")
      }
    },
    openUrl: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      requestCreateTab(keyBind.valueString)
    },
    setFx: (keyBind: KeyBind, config: Config, tabId: number, pin: Pin, ctx: Context, flags: {changed: boolean}) => {
      setFx(keyBind.filterTarget, keyBind.valueState, ctx)
      flags.changed = true 

      if (!config.hideIndicator) {
        this.shadowHost?.showSmall(`FX (${window.gsm[`token_${keyBind.filterTarget}`] || ""}) = ${window.gsm[`token_${keyBind.valueState}`] || ""}`)
      }
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

        if (!config.hideIndicator) {
          this.shadowHost?.showSmall(`${window.gsm[filterInfo.name] || ""} = ${round(newValue, 2)}`)
        }
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
        if (!config.hideIndicator) {
          this.shadowHost?.showSmall(`${window.gsm[filterInfo.name] || ""} = ${round(newValue, 2)}`)
        }
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
        if (!config.hideIndicator) {
          this.shadowHost?.showSmall(`${window.gsm[filterInfo.name] || ""} = ${round(newValue, 2)}`)
        }
      }

      flags.changed = true 
    }
  }
}