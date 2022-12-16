

import { seekNetflix } from "./utils/seekNetflix"
import { native } from "./utils/nativeCodes"
import { isFirefox } from "../utils/helper"


document.currentScript?.remove()

declare global {
  interface Window {
    loadedGsCtx: boolean
  }
}

let mediaReferences: HTMLMediaElement[] = []
let shadowRoots: ShadowRoot[] = []
let client: StratumClient
let ghostMode: GhostMode
let toStringHijack: ToStringHijack

let ensureYtLastSpeed: number 
let handleYtRateChange: (newSpeed: number) => void 


function main() {
  if (isFirefox()) {
    if (window.loadedGsCtx) return 
    window.loadedGsCtx = true 

    ensureSoundcloud()
  }
  ensureBaidu()


  toStringHijack = new ToStringHijack() 
  ensureBilibili()
  ghostMode = new GhostMode()
  client = new StratumClient()
  ensureYt()
  


  overridePrototypeMethod(HTMLMediaElement, "play", handleOverrideMedia)
  overridePrototypeMethod(HTMLMediaElement, "pause", handleOverrideMedia)
  overridePrototypeMethod(HTMLMediaElement, "load", handleOverrideMedia)

  overridePrototypeMethod(Element, "createShadowRoot", handleOverrideShadow)
  overridePrototypeMethod(Element, "attachShadow", handleOverrideShadow)
}

function overridePrototypeMethod(type: any, methodName: string, eventCb: (args: any, _this: any, _return: any) => void) {
  const ogFunc = type?.prototype[methodName]
  if (!ogFunc) return 
  type.prototype[methodName] = function(...args: any[]) {
    const _return = ogFunc.apply(this, args)
    eventCb(args, this, _return)
    return _return
  }
  try {
    toStringHijack.set(type.prototype[methodName], ogFunc)
  } catch (err) {}
}

function handleOverrideMedia(args: any, _this: HTMLMediaElement, _return: any) {
  if (!(_this instanceof native.HTMLMediaElement)) {
    return 
  }
  if (native.array.includes.call(mediaReferences, _this)) return 
  native.array.push.call(mediaReferences, _this)
  client.wiggleOn(_this)
}

function handleOverrideShadow(args: [ShadowRootInit], _this: Element, _return: ShadowRoot) {
  if (!(_return instanceof native.ShadowRoot)) return 
  if (native.array.includes.call(shadowRoots, _return)) return 
  native.array.push.call(shadowRoots, _return)
  client.wiggleOn(_return)
}

// soundcloud support for Firefox (may remove later)
function ensureSoundcloud() {
  if (!document.domain.includes("soundcloud.com")) return 

  const og = AudioContext.prototype.createMediaElementSource
  AudioContext.prototype.createMediaElementSource = function(...args) {
    const out = og.apply(this, [document.createElement("audio")])
    return out  
  }
}

function ensureBaidu() {
  if (!location.hostname.includes("pan.baidu.com")) return 
  const ua = navigator.userAgent
  let newUa: string
  
  if (ua.includes("Windows NT")) {
      newUa = ua.replace("Windows NT", "Windоws NT")
  } else if (ua.includes("Macintosh")) {
      newUa = ua.replace("Macintosh", "Macintоsh")
  } 
  
  if (newUa) {
      const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, "userAgent")
      Object.defineProperty(Navigator.prototype, "userAgent", {...desc, get: function() {return newUa}})
  }
}

function ensureYt() {
  if (location.hostname !== "www.youtube.com") return 

  window.addEventListener("timeupdate", function() {
    let player = document.querySelector("#movie_player") as any; 
    if (!player) return 

    try {
      player.getAvailablePlaybackRates().push(16)
    } catch (err) {
      return 
    }

    handleYtRateChange = (speed: number) => {
      if (ensureYtLastSpeed === speed) return 
      ensureYtLastSpeed = speed
      try {
        ghostMode.activateFor(1000)
        player.setPlaybackRate(speed) 
      } catch (err) {}
    }
  
    client?.send({type: "YT_REQUEST_RATE"})
  }, {capture: true, once: true})
}


function ensureBilibili() {
  if (!document.domain.includes("bilibili.com")) return 

  let og = window.localStorage.getItem;
  window.localStorage.getItem = function(...args) {
    let out = og.apply(this, args)
    try {
      if (args[0] === "bwphevc_supported") {
        let parsed = JSON.parse(out);
        if (parsed.supported && !(parsed?.info?.isBrowserHEVCTypeSupported)) {
          parsed.supported = false  
          return JSON.stringify(parsed)
        }
      }
    } catch (err) {}
    return out 
  }
  toStringHijack.set(window.localStorage.getItem, og)
}

class ToStringHijack {
  originalFn = Function.prototype.toString
  outputMap = new Map<any, string> ()
  constructor() {  
    if (location.hostname.includes("twitch")) {
      return 
    }

    let self = this

    Function.prototype.toString = function(...args) {
      try {
        const output = native.map.get.call(self.outputMap, this)
        if (output) return output
      } catch (err) { }
      return self.originalFn.apply(this, args)
    }

    this.set(Function.prototype.toString, this.originalFn)
  }
  set = (replacement: Function, original: Function) => {
    try {
      const output = this.originalFn.call(original)
      output && native.map.set.call(this.outputMap, replacement, output)
    } catch (err) {}
  }
}

class GhostMode {
  active = false 
  tempTimeout?: number
  dummyAudio = new Audio()
  ogDesc = {
    playbackRate: Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "playbackRate"),
    defaultPlaybackRate: Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "defaultPlaybackRate")
  }
  coherence = {
    playbackRate: new Map<HTMLMediaElement, number>(),
    defaultPlaybackRate: new Map<HTMLMediaElement, number>()
  }
  constructor() {
    for (let key of ["playbackRate", "defaultPlaybackRate"] as ("playbackRate" | "defaultPlaybackRate")[]) {
      const ogDesc = this.ogDesc[key]
      let coherence = this.coherence[key]

      let self = this 
  
      try {
        Object.defineProperty(HTMLMediaElement.prototype, key, {
          configurable: true, 
          enumerable: true,
          get: function() {
            self.ogDesc[key].get.call(this)
            return self.active ? (native.map.has.call(coherence, this) ? native.map.get.call(coherence, this) : 1) : ogDesc.get.call(this)
          }, 
          set: function(newValue) {
            if (self.active && !(this instanceof native.HTMLMediaElement)) {
              self.ogDesc[key].set.call(this, newValue)
            }
            try {
              let output = ogDesc.set.call(self.active ? self.dummyAudio : this, newValue)
              let rate = ogDesc.get.call(self.active ? self.dummyAudio : this)
              native.map.set.call(coherence, this, rate)
              return output 
            } catch (err) {
              throw err 
            }
          }
        })
  
        const newDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, key)
  
        toStringHijack.set(newDesc.get, ogDesc.get)
        toStringHijack.set(newDesc.set, ogDesc.set)
      } catch (err) { }
    }

  }
  activate = () => {
    if (this.tempTimeout) {
      clearTimeout(this.tempTimeout)
      delete this.tempTimeout
    }
    if (this.active) return 
    this.active = true 


    native.map.clear.call(this.coherence.playbackRate)
    native.map.clear.call(this.coherence.defaultPlaybackRate)

    mediaReferences.forEach(m => {
      native.map.set.call(this.coherence.playbackRate, m, this.ogDesc.playbackRate.get.call(m))
      native.map.set.call(this.coherence.defaultPlaybackRate, m, this.ogDesc.defaultPlaybackRate.get.call(m))
    })
  }
  deactivate = () => {
    if (this.tempTimeout) {
      clearTimeout(this.tempTimeout)
      delete this.tempTimeout
    }
    if (!this.active) return 
    this.active = false  
  }  
  activateFor = (ms: number) => {
    if (this.active) return 
    this.activate()
    this.tempTimeout = setTimeout(this.deactivate, ms) 
  }
}

class StratumClient {
  private parasite = document.createElement("div")
  private parasiteRoot = this.parasite.attachShadow({mode: "open"})
  constructor() {
    this.parasite.id = "GS_PARASITE"
    this.parasiteRoot.addEventListener("GS_CLIENT", this.handle, {capture: true})
    document.documentElement.appendChild(this.parasite)
    this.parasite.dispatchEvent(new CustomEvent("GS_INIT"))
  }
  handle = (e: CustomEvent) => {
    native.stopImmediatePropagation.call(e)
    let data: any; 
    try {
      e.detail && (data = native.JSON.parse(e.detail))
    } catch (err) {}

    if (!data) return 

    if (data.type === "SEEK_NETFLIX") {
      seekNetflix(data.value)
    } else if (data.type === "GHOST") {
      data.off ? ghostMode.deactivate() : ghostMode.activate()
    } else if (data.type === "YT_RATE_CHANGE") {
      data.value && handleYtRateChange?.(data.value)
    }
  }
  send = (data: any) => {
    native.dispatchEvent.call(this.parasiteRoot, new native.CustomEvent("GS_SERVER", {detail: native.JSON.stringify({type: "MSG", data})}))
  }
  wiggleOn = (parent: HTMLElement | ShadowRoot) => {
    native.appendChild.call(parent, this.parasite)
    native.dispatchEvent.call(this.parasiteRoot, new native.CustomEvent("GS_SERVER", {detail: native.JSON.stringify({type: "WIGGLE"})}))
  }
}

main()