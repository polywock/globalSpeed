

import { seekNetflix } from "./utils/seekNetflix"
import { WindowTalk } from "./utils"
import { callNative } from "./utils/nativeCodes"
import { isFirefox } from "../utils/helper"



document.currentScript?.remove()

declare global {
  interface Window {
    loadedGsCtx: boolean
  }
}

let mediaReferences: HTMLMediaElement[] = []
let shadowRoots: ShadowRoot[] = []
let talk: WindowTalk
let parasite: HTMLDivElement;
let parasiteWiggle = new Event("PARASITE_WIGGLE", {composed: false, bubbles: false})
let dummyAudio = new Audio()
let ghostMode = false 

function main() {
  if (isFirefox()) {
    if (window.loadedGsCtx) return 
    window.loadedGsCtx = true 

    // soundcloud.com support for Firefox (may remove later)
    if (document.URL.startsWith("https://soundcloud.com/")) {
      const og = AudioContext.prototype.createMediaElementSource
      AudioContext.prototype.createMediaElementSource = function(...args) {
        const out = og.apply(this, [document.createElement("audio")])
        return out  
      }
    }
  }
  
  // #region ignore, used for testing
  // console.log("CTX NOW", performance.now())
  // const scripts = [...document.scripts].filter(v => v.src);
  // scripts.length && console.log(scripts.map(v => v.src).join(", "));
  // scripts.forEach(v => {
  //   v.onload = () => {
  //     console.log("LOADED", v.src)
  //   }
  // })
  // #endregion

  talk = new WindowTalk("GLOBAL_SPEED_CTX", "GLOBAL_SPEED_CS")
  // append parasite 
  parasite = document.createElement("div")
  parasite.id = "GS_PARASITE"
  parasite.attachShadow({mode: "open"})
  document.documentElement.appendChild(parasite)

  talk.sendKey(true)
  talk.cbs.add(handleTalk)

  overridePrototypeMethod(HTMLMediaElement, "play", handleOverrideMedia)
  overridePrototypeMethod(HTMLMediaElement, "pause", handleOverrideMedia)
  overridePrototypeMethod(HTMLMediaElement, "load", handleOverrideMedia)

  overridePrototypeMethod(Element, "createShadowRoot", handleOverrideShadow)
  overridePrototypeMethod(Element, "attachShadow", handleOverrideShadow)
}

function handleTalk(msg: any) {
  if (msg.type === "SEEK_NETFLIX") {
    seekNetflix(msg.value)
  } else if (msg.type === "ACTIVATE_GHOST") {
    activateGhost()
  }
}

function overridePrototypeMethod(type: any, methodName: string, eventCb: (args: any, _this: any, _return: any) => void) {
  const ogFunc = type.prototype[methodName]
  type.prototype[methodName] = function(...args: any[]) {
    const _return = ogFunc.apply(this, args)
    eventCb(args, this, _return)
    return _return
  }
}


function handleOverrideMedia(args: any, _this: HTMLMediaElement, _return: any) {
  if (!(_this instanceof HTMLMediaElement)) {
    return 
  }
  if (mediaReferences.includes(_this)) return 
  mediaReferences.push(_this)
  wiggleOn(_this)
}

function handleOverrideShadow(args: [ShadowRootInit], _this: Element, _return: ShadowRoot) {
  if (!(_return instanceof ShadowRoot)) return 
  if (shadowRoots.includes(_return)) return 
  shadowRoots.push(_return)
  wiggleOn(_return)
}

function wiggleOn(target: ShadowRoot | HTMLMediaElement) {
  target.appendChild(parasite)
  callNative("dispatchEvent", parasite.shadowRoot, parasiteWiggle)
}

function activateGhost() {
  if (ghostMode) return 
  ghostMode = true 

  for (let key of ["playbackRate", "defaultPlaybackRate"]) {
    const ogDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, key)

    let coherence = new Map()
    mediaReferences.forEach(m => {
      coherence.set(m, m[key as keyof typeof m])
    })

    try {
      Object.defineProperty(HTMLMediaElement.prototype, key, {
        configurable: true, 
        enumerable: true,
        get: function() {
          return coherence.has(this) ? coherence.get(this) : 1
        }, 
        set: function(newValue) {
          try {
            let output = ogDesc.set.call(dummyAudio, newValue)
            let rate = ogDesc.get.call(dummyAudio)
            coherence.set(this, rate)
            return output 
          } catch (err) {
            throw err 
          }
        }
      })
    } catch (err) { }
  }
}



main()