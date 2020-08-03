import { extractHotkey, compareHotkeys } from "../utils/keys"
import { Overlay } from "./Overlay"
import { MessageCallback } from "../utils/browserUtils"
import { injectScript, documentHasFocus } from "./utils"
import { subscribeView, fetchView } from "../background/GlobalState"
import { FxSync } from "./FxSync"
import { SpeedSync } from "./SpeedSync"
import { Pane } from "./Pane"

export class ConfigSync {
  port: chrome.runtime.Port 
  released = false
  blockNext = false 
  lastTrigger = 0
  fxSync: FxSync
  speedSync: SpeedSync
  client = subscribeView({enabled: true, keybinds: true}, window.tabInfo.tabId, true, () => {
    this.handleEnabledChange()
  }, 300)
  constructor() {
    fetchView({indicatorInit: true}).then(view => {
      window.overlay?.setInit(view.indicatorInit || {})
    })
    
    this.port = chrome.runtime.connect({name: "configSync"}) 
    
    // delay a bit to ensure view is loaded.
    setTimeout(() => {
      window.addEventListener("keydown", this.handleKeyDown, true)
      window.addEventListener("keyup", this.handleKeyUp, true)
    }, 100)

    chrome.runtime.onMessage.addListener(this.handleMessage)
  }
  release = () => {
    if (this.released) return 
    this.client?.release(); delete this.client
    this.released = true 
    this.fxSync?.release(); delete this.fxSync
    this.speedSync?.release(); delete this.speedSync
    this.port?.disconnect(); delete this.port
    window.removeEventListener("keydown", this.handleKeyDown, true)
    window.removeEventListener("keyup", this.handleKeyUp, true)
    chrome.runtime.onMessage.removeListener(this.handleMessage)
  }
  handleEnabledChange = () => {
    if (this.client.view?.enabled) {
      this.fxSync = this.fxSync ?? new FxSync()
      this.speedSync = this.speedSync ?? new SpeedSync()
    } else {
      this.fxSync?.release(); delete this.fxSync
      this.speedSync?.release(); delete this.speedSync
    }
  } 
  handleKeyUp = (e: KeyboardEvent) => {
    this.lastTrigger = 0
    if (this.blockNext) {
      this.blockNext = false 
      e.stopImmediatePropagation()
      e.preventDefault()
    }
  }
  handleKeyDown = (e: KeyboardEvent) => {
    const keybinds = this.client.view.keybinds
    const enabled = this.client.view.enabled

    this.blockNext = false 

    // stop if input fields 
    const target = e.target as HTMLElement
    if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) {
      return 
    }
  
    const eventHotkey = extractHotkey(e)
    let validKeybinds = enabled ? keybinds : keybinds.filter(v => v.command === "setState")
    validKeybinds = validKeybinds.filter(v => v.enabled && !v.global && compareHotkeys(v.key, eventHotkey))

    if (validKeybinds.some(v => v.greedy)) {
      this.blockNext = true 
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    if (validKeybinds.length) {
      const now = new Date().getTime()
      if (now - this.lastTrigger > 50) {
        this.lastTrigger = now
        chrome.runtime.sendMessage({type: "TRIGGER_KEYBINDS", ids: validKeybinds.map(kb => kb.id)})
      }
    }
  }
  handleMessage: MessageCallback = (msg, sender, reply) => {
    if (msg.type === "SHOW_INDICATOR") {
      if (msg.requiresFocus && !documentHasFocus()) return 
      window.overlay.show(msg.opts)
      reply(true)
    } else if (msg.type === "INJECT_SCRIPT") {
      if (msg.requiresFocus && !documentHasFocus()) return 
      injectScript(msg.code)
      reply(true)
    } else if (msg.type === "ADD_PANE") {
      new Pane(msg.filter)
    } else if (msg.type === "CLEAR_PANES") {
      [...Pane.panes].forEach(pane => {
        pane.release()
      })
    }
  }
}

