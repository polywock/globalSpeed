import { extractHotkey } from "../../utils/keys"
import { SubscribeView } from "../../utils/state"
import { FxSync } from "./FxSync"
import { findMatchingPageKeybinds, getActiveParts, hasActiveParts, testURL, testURLWithPart } from "../../utils/configUtils"
import { AdjustMode, URLCondition, URLConditionPart } from "@/types"
import { Circle } from "./utils/Circle"
import { getLeaf } from "@/utils/nativeUtils"
import { getEmptyUrlConditions } from "@/defaults"
import { getPracticalRuntimeUrl } from "@/utils/helper"

const ghostModeStatic = [".qq.com", "wetv.vip", "web.whatsapp.com", "pan.baidu.com", "onedrive.live.com", "open.spotify.com", ".instagram.com", ".descript.com", "www.ccmtv.cn", ".douyin.com", ".tiktok.com", ".linkedin.com", "mooc1.chaoxing.com"]
  .some(site => (location.hostname || "").includes(site))

export class ConfigSync {
  released = false
  blockKeyUp = false
  lastTrigger = 0
  fxSync: FxSync
  urlConditionsClient = new SubscribeView({ keybindsUrlCondition: true }, gvar.tabInfo.tabId, true, (v, onLaunch) => {
    this.handleChangeUrlConditionsList()
  }, 300)
  client = new SubscribeView({ ghostMode: true, ghostModeUrlCondition: true, enabled: true, superDisable: true, latestViaShortcut: true, pageKeybinds: true, indicatorInit: true, circleWidget: true, circleInit: true, holdToSpeed: true }, gvar.tabInfo.tabId, true, (v, onLaunch) => {
    if (onLaunch) this.init()
    this.handleChange()
  }, 300)
  speedClient = new SubscribeView({ speed: true, freePitch: true, enabled: true, superDisable: true }, gvar.tabInfo.tabId, true, v => {
    this.handleSpeedChange()
  }, 100, 150)
  ignoreList = new Set<string>()
  init = () => {
    gvar.os.eListen.keyDownCbs.add(this.handleKeyDown)
    gvar.os.eListen.keyUpCbs.add(this.handleKeyUp)
    this.handleSpeedChange()
  }
  release = () => {
    if (this.released) return
    this.released = true
    this.urlConditionsClient?.release(); delete this.urlConditionsClient
    this.client?.release(); delete this.client
    this.speedClient?.release(); delete this.speedClient
    this.fxSync?.release(); delete this.fxSync
    gvar.os.eListen.keyDownCbs.delete(this.handleKeyDown)
    gvar.os.eListen.keyUpCbs.delete(this.handleKeyUp)
  }
  urlConditions: URLCondition
  urlConditionsMode: 'Off' | 'On' | 'Runtime' = 'Off'
  urlConditionsNonStatic: URLConditionPart[] = []
  handleChangeUrlConditionsList = () => {
    this.urlConditions = this.urlConditionsClient.view.keybindsUrlCondition || getEmptyUrlConditions(true)
    const enabledParts = getActiveParts(this.urlConditions)
    const runtimeUrl = getPracticalRuntimeUrl()

    if (enabledParts.length === 0) {
      this.urlConditionsMode = 'On'
      return
    }

    let statics: URLConditionPart[] = []
    let nonStatics: URLConditionPart[] = []

    enabledParts.forEach(part => {
      (websiteCanBeStaticTested(part, runtimeUrl) ? statics : nonStatics).push(part)
    })


    this.urlConditionsNonStatic = nonStatics

    // All statics should be dealt with.

    if (statics.length === 0) {
      this.urlConditionsMode = 'Runtime'
      return
    }
    const anyMatched = statics.some(st => testURLWithPart(runtimeUrl, st))
    if (!anyMatched) {
      this.urlConditionsMode = 'Runtime'
    } else {
      this.urlConditionsMode = this.urlConditions.block ? 'Off' : 'On'
    }

    // Resolve 'Runtime' instantly if no dynamic parts.
    if (this.urlConditionsMode === 'Runtime' && nonStatics.length === 0) {
      this.urlConditionsMode = this.urlConditions.block ? 'On' : 'Off'
    }
  }
  checkUrlRuntime = () => {
    if (this.urlConditionsMode !== "Runtime") return this.urlConditionsMode
    const url = getPracticalRuntimeUrl()
    const anyMatched = this.urlConditionsNonStatic.some(st => testURLWithPart(url, st))
    if (this.urlConditions.block) return anyMatched ? 'Off' : 'On'
    return anyMatched ? 'On' : 'Off'
  }
  handleChange = () => {
    const view = this.client.view
    const enabled = view?.enabled && !view.superDisable

    if (gvar.os.indicator && gvar.os.indicator.key !== view?.indicatorInit?.key) {
      gvar.os.indicator.setInit(view?.indicatorInit || {})
    }

    gvar.os.speedSync.holdToSpeed = view.holdToSpeed

    if (enabled) {
      this.fxSync = this.fxSync ?? new FxSync()
    } else {
      this.fxSync?.release(); delete this.fxSync
    }

    if (enabled && view.circleWidget) {

      // Update when settings change. 
      if (gvar.os.circle && gvar.os.circle.key !== view.circleInit?.key) {
        gvar.os.circle?.release()
        delete gvar.os.circle
      }

      gvar.os.circle = gvar.os.circle || new Circle(view.circleInit)
    } else {
      gvar.os.circle?.release()
      delete gvar.os.circle
    }

    // Ghost mode
    let calcGhostMode = false
    if (view?.ghostMode && testURL(getPracticalRuntimeUrl(), view.ghostModeUrlCondition, true)) {
      calcGhostMode = true
    }
    
    if (view?.enabled && (calcGhostMode || ghostModeStatic)) {
      if (!gvar.ghostMode) {
        gvar.ghostMode = true
        gvar.os.stratumServer.initialized ? this.sendGhostOn() : gvar.os.stratumServer.initCbs.add(this.sendGhostOn)
      }
    } else {
      if (gvar.ghostMode) {
        gvar.ghostMode = false
        gvar.os.stratumServer.initialized ? this.sendGhostOff() : gvar.os.stratumServer.initCbs.add(this.sendGhostOff)
      }
    }
  }
  handleSpeedChange = () => {
    const speedView = this.speedClient.view

    if (speedView && speedView.enabled && !speedView.superDisable) {
      gvar.os.speedSync.latest = { speed: speedView.speed, freePitch: speedView.freePitch }
      gvar.os.speedSync.update()
    } else {
      delete gvar.os.speedSync.latest
      gvar.os.speedSync.update()
    }
  }
  sendGhostOn = () => gvar.os.stratumServer.send({ type: "GHOST" })
  sendGhostOff = () => gvar.os.stratumServer.send({ type: "GHOST", off: true })
  sendBgHideOn = () => gvar.os.stratumServer.send({ type: "BG_HIDE" })
  sendBgHideOff = () => gvar.os.stratumServer.send({ type: "BG_HIDE", off: true })
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

    const enabled = this.client.view.enabled

    let keybinds = this.client.view.pageKeybinds
    if (!enabled) {
      keybinds = (keybinds || []).filter(kb =>
        kb.command === "state" &&
        kb.enabled &&
        (this.client.view.latestViaShortcut || kb.alwaysOn)
      )

      if (!keybinds.length) return
    }

    this.blockKeyUp = false


    // stop if input fields 
    const target = e.target as HTMLElement
    if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable || document.pointerLockElement) {
      return 
    }

    const active = getLeaf(document, 'activeElement')
    if (target !== active) {
      if (["INPUT", "TEXTAREA"].includes(active.tagName) || (active as HTMLElement).isContentEditable) {
        return
      }
    }

    if (this.checkUrlRuntime() === 'Off') return

    const eventHotkey = extractHotkey(e, true, true)
    let matches = findMatchingPageKeybinds(keybinds, eventHotkey)

    matches = matches.filter(match => {
      if (match.kb.condition && hasActiveParts(match.kb.condition)) {
        return testURL(getPracticalRuntimeUrl(), match.kb.condition, true)
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
        chrome.runtime.sendMessage({ type: "TRIGGER_KEYBINDS", ids: matches.map(match => ({ id: match.kb.id, alt: match.alt })) })
      }
    }
  }
}


function websiteCanBeStaticTested(entry: URLConditionPart, runtimeUrl: string) {
  const value = (entry.valueStartsWith || "").trim()
  if (entry.type === "STARTS_WITH" && value.startsWith('http')) {
    if (!gvar.isTopFrame && !gvar.topFrameUrl) return false
    const count = [...value].filter(ch => ch === '/').length
    if (count === 2) return true
    if (count === 3 && value.endsWith('/')) return true
    const origin = safeGetOrigin(runtimeUrl) || location.origin || ""
    if (!value.startsWith(origin)) return true
  }
}

function safeGetOrigin(url: string) {
  try {
    return new URL(url).origin
  } catch (err) {}
}
