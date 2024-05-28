import { extractHotkey  } from "../../utils/keys"
import { SubscribeView } from "../../utils/state"
import { FxSync } from "./FxSync"
import { findMatchingKeybindsLocal, testURL } from "../../utils/configUtils"
import { AdjustMode } from "src/types"
import { Circle } from "./utils/Circle"
import { getLeaf } from "src/utils/nativeUtils"

const FORCED_GHOST_SITES = ["v.qq.com", "www.qq.com", "sports.qq.com", "wetv.vip", "web.whatsapp.com", "pan.baidu.com", "onedrive.live.com", "open.spotify.com", "www.instagram.com"]


export class ConfigSync {
  released = false
  blockKeyUp = false 
  lastTrigger = 0
  fxSync: FxSync
  client = new SubscribeView({ghostMode: true, ghostModeUrlCondition: true, enabled: true, superDisable: true, latestViaShortcut: true, keybinds: true, keybindsUrlCondition: true, indicatorInit: true, circleWidget: true, circleInit: true}, gvar.tabInfo.tabId, true, (v, onLaunch) => {
    if (onLaunch) this.init() 
    this.handleChange()
  }, 300)
  speedClient = new SubscribeView({speed: true, freePitch: true, enabled: true, superDisable: true}, gvar.tabInfo.tabId, true, v => {
    this.handleSpeedChange()
  }, 150, 300)
  ignoreList = new Set<string>() 
  init = () => {
    gvar.os.eListen.keyDownCbs.add(this.handleKeyDown)
    gvar.os.eListen.keyUpCbs.add(this.handleKeyUp)
    this.handleSpeedChange()
  }
  release = () => {
    if (this.released) return 
    this.released = true 
    this.client?.release(); delete this.client
    this.speedClient?.release(); delete this.speedClient
    this.fxSync?.release(); delete this.fxSync
    gvar.os.eListen.keyDownCbs.delete(this.handleKeyDown)
    gvar.os.eListen.keyUpCbs.delete(this.handleKeyUp)
  }
  handleChange = () => {
    const view = this.client.view
    const enabled = view?.enabled && !view.superDisable

    gvar.os.indicator?.setInit(view?.indicatorInit || {})

    if (enabled) {
      this.fxSync = this.fxSync ?? new FxSync()
    } else {
      this.fxSync?.release(); delete this.fxSync
    }

    if (enabled && view.circleWidget)  {
      gvar.os.circle = gvar.os.circle || new Circle(view.circleInit)
    } else {
      gvar.os.circle?.release()
      delete gvar.os.circle
    }

    let calcGhostMode = false 
    if (view?.ghostMode && testURL(location.href || "", view.ghostModeUrlCondition, true)) {
      calcGhostMode = true 
    }

    if (view?.enabled && (calcGhostMode || FORCED_GHOST_SITES.some(site => (location.hostname || "").includes(site)))) {
      if (gvar.ghostMode) return 
      gvar.ghostMode = true 
      gvar.os.stratumServer.initialized ? this.sendGhostOn() : gvar.os.stratumServer.initCbs.add(this.sendGhostOn)

    } else {
      if (!gvar.ghostMode) return 
      gvar.ghostMode = false  
      gvar.os.stratumServer.initialized ? this.sendGhostOff() : gvar.os.stratumServer.initCbs.add(this.sendGhostOff)
    }
  } 
  handleSpeedChange = () => {
    const speedView = this.speedClient.view

    if (speedView && speedView.enabled && !speedView.superDisable) {
      gvar.os.speedSync.latest = {speed: speedView.speed, freePitch: speedView.freePitch}
      gvar.os.speedSync.update()
    } else {
      delete gvar.os.speedSync.latest
      gvar.os.speedSync.update()
    }
  } 
  sendGhostOn = () => gvar.os.stratumServer.send({type: "GHOST"}) 
  sendGhostOff = () => gvar.os.stratumServer.send({type: "GHOST", off: true}) 
  handleKeyUp = (e: KeyboardEvent) => {
    this.lastTrigger = 0
    this.ignoreList.clear()
    if (this.blockKeyUp) {
      this.blockKeyUp = false 
      e.stopImmediatePropagation()
      e.preventDefault()
    }
  }
  handleKeyDown = (e: KeyboardEvent) => {
    if (document.activeElement?.tagName === "IFRAME") return 
    if (!chrome.runtime?.id) return gvar.os.handleOrphan()
    if (!this.client?.view) return 
    if (this.client.view.superDisable) return 
    const enabled = this.client.view.enabled && !this.client.view.superDisable
    if (!enabled && !this.client.view.latestViaShortcut) return 

    const keybinds = this.client.view.keybinds
    this.blockKeyUp = false 


    // stop if input fields 
    const target = e.target as HTMLElement
    if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) {
      return 
    }

    const active = getLeaf(document, 'activeElement')
    if (target !== active) {
      if (["INPUT", "TEXTAREA"].includes(active.tagName) || (active as HTMLElement).isContentEditable) {
        return 
      }
    }

    if (this.client.view.keybindsUrlCondition?.parts?.length) {
      if (!testURL(location.href || "", this.client.view.keybindsUrlCondition, true)) {
        return 
      }
    }
  
    const eventHotkey = extractHotkey(e, true, true)
    let matches = findMatchingKeybindsLocal(enabled ? keybinds : keybinds.filter(v => v.command === "state"), eventHotkey)

    matches = matches.filter(match => {
      if (match.kb.condition?.parts.length > 0) {
        return testURL(window.location.href || "" , match.kb.condition, true)
      } 
      return true 
    })

    if (matches.some(v => v.kb.greedy)) {
      this.blockKeyUp = true 
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    

    matches = matches.filter(match => !(match.kb.adjustMode === AdjustMode.ITC || match.kb.adjustMode === AdjustMode.ITC_REL) || !this.ignoreList.has(match.kb.id))

    if (matches.length) {
      const now = Date.now()
      if (now - this.lastTrigger > 50) {
        this.lastTrigger = now
        matches.filter(match => match.kb.adjustMode === AdjustMode.ITC || match.kb.adjustMode === AdjustMode.ITC_REL).forEach(v => this.ignoreList.add(v.kb.id))
        chrome.runtime.sendMessage({type: "TRIGGER_KEYBINDS", ids: matches.map(match => ({id: match.kb.id, alt: match.alt}))})
      }
    }
  }
}
