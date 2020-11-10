import { extractHotkey, compareHotkeys } from "../utils/keys"
import { MessageCallback } from "../utils/browserUtils"
import { injectScript, documentHasFocus, findLeafActiveElement } from "./utils"
import { subscribeView, fetchView } from "../background/GlobalState"
import { FxSync } from "./FxSync"
import { SpeedSync } from "./SpeedSync"
import { Pane } from "./Pane"
import { checkURLCondition } from "../utils/configUtils"

export class ConfigSync {
  port: chrome.runtime.Port 
  released = false
  blockKeyUp = false 
  lastTrigger = 0
  fxSync: FxSync
  speedSync: SpeedSync
  client = subscribeView({enabled: true, keybinds: true, superDisable: true}, window.tabInfo.tabId, true, () => {
    this.handleEnabledChange()
  }, 300)
  constructor() {
    fetchView({indicatorInit: true}).then(view => {
      window.overlay?.setInit(view.indicatorInit || {})
    })
    
    this.port = chrome.runtime.connect({name: "configSync"}) 
    
    // delay a bit to ensure view is loaded.
    setTimeout(() => {
      window.keyListener.downCbs.add(this.handleKeyDown)
      window.keyListener.upCbs.add(this.handleKeyUp)
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
    window.keyListener.downCbs.delete(this.handleKeyDown)
    window.keyListener.upCbs.delete(this.handleKeyUp)
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
    if (this.blockKeyUp) {
      this.blockKeyUp = false 
      e.stopImmediatePropagation()
      e.preventDefault()
    }
  }
  handleKeyDown = (e: KeyboardEvent) => {
    if (this.client?.view?.superDisable) return 

    const keybinds = this.client.view.keybinds
    const enabled = this.client.view.enabled

    this.blockKeyUp = false 

    // stop if input fields 
    const target = e.target as HTMLElement
    if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) {
      return 
    }

    const active = findLeafActiveElement(document)
    if (target !== active) {
      if (["INPUT", "TEXTAREA"].includes(active.tagName) || (active as HTMLElement).isContentEditable) {
        return 
      }
    }
  
    const eventHotkey = extractHotkey(e)
    let validKeybinds = enabled ? keybinds : keybinds.filter(v => v.command === "setState")
    validKeybinds = validKeybinds.filter(v => v.enabled && !v.global && compareHotkeys(v.key, eventHotkey))

    validKeybinds = validKeybinds.filter(kb => {
      if (kb.condition?.parts.length > 0) {
        return checkURLCondition(window.location.href || "" , kb.condition, true)
      } 
      return true 
    })

    if (validKeybinds.some(v => v.greedy)) {
      this.blockKeyUp = true 
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
      return 
    } else if (msg.type === "INJECT_SCRIPT") {
      if (msg.requiresFocus && !documentHasFocus()) return 
      injectScript(msg.code)
      reply(true)
      return 
    } else if (msg.type === "ADD_PANE") {
      new Pane(msg.filter)
    } else if (msg.type === "CLEAR_PANES") {
      [...Pane.panes].forEach(pane => {
        pane.release()
      })
    }
  }
}