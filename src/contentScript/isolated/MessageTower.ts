import { MessageCallback } from "src/utils/browserUtils"
import { MediaEvent, MediaEventCinema, applyCinema, getMediaProbe, realizeMediaEvent } from "./utils/applyMediaEvent"
import { documentHasFocus, injectScript } from "./utils"
import { Indicator, IndicatorShowOpts } from "./utils/Indicator"
import { Interactive } from "./utils/Interactive"
import type { ItcInit } from "src/types"
import { getLeaf } from "src/utils/nativeUtils"

declare global {
    interface GlobalVar {
        mt: typeof MessageTower
    }
    interface Message {
        applyMediaEvent: {type: "APPLY_MEDIA_EVENT", key: string, event: MediaEvent},
        topFrameUrlUpdate: {type: "TOP_FRAME_URL_UPDATE", value: string},
        temporarySpeed: {type: "SET_TEMPORARY_SPEED", factor?: number},
        mediaProbe: {type: "MEDIA_PROBE", key: string, formatted?: boolean},
        csAlive: {type: "CS_ALIVE"},
        runJs:  {type: "RUN_JS", value: string},
        bgSpeedOverride: {type: "BG_SPEED_OVERRIDE", value: {speed: number, freePitch: boolean}},
  
        ytRequestRate: {type: "YT_REQUEST_RATE"},
        ytRateChange: {type: "YT_RATE_CHANGE", value: number},
  
        showIndicator: { type: "SHOW_INDICATOR", opts: IndicatorShowOpts, requiresFocus?: boolean, showAlt?: boolean  }
        addPane: { type: "ADD_PANE", filter: any }
        itc: {type: "ITC", inits: ItcInit[]}
        cinema: {type: "CINEMA", event: MediaEventCinema}
    }
}


export class MessageTower {
    constructor() {
        chrome.runtime.onMessage.addListener(this.handleMessage)
    }
    handleMessage: MessageCallback = (msg: Messages, sender, reply) => {
        if (msg.type === "APPLY_MEDIA_EVENT") {
          realizeMediaEvent(msg.key, msg.event)
          reply(true); return 
        } else if (msg.type === "SET_TEMPORARY_SPEED") {
          reply(true)
          gvar.os.speedSync?.processTemporarySpeed(msg.factor)
        } else if (msg.type === "TOP_FRAME_URL_UPDATE") {
          gvar.topFrameUrl = msg.value 
        } else if (msg.type === "RUN_JS") {
          // used to run "javascript" URL rules for Firefox.
          injectScript(msg.value)
          reply(true)
          return 
        } else if (msg.type === "BG_SPEED_OVERRIDE") {
          if (!gvar.os?.speedSync) return 
          gvar.os.speedSync.latest = msg.value
          gvar.os.speedSync.update()
        } else if (msg.type === "SHOW_INDICATOR") {
          if (msg.requiresFocus && !documentHasFocus()) return 
          if (msg.showAlt) {
            if (!gvar.os.indicatorAlt) {
              gvar.os.indicatorAlt = new Indicator()
              gvar.os.indicatorAlt.setInit({position: 'C', rounding: 3, scaling: 1.3, showShadow: true})
            } 
            gvar.os.indicatorAlt.show(msg.opts)
          } else {
            gvar.os.indicator.show(msg.opts)
          }
          reply(true)
          return 
        } else if (msg.type === "ADD_PANE") {
          if (!gvar.Pane) {
            chrome.runtime.sendMessage({type: "REQUEST_PANE"} as Messages).then(() => {
              gvar.Pane && new gvar.Pane(msg.filter)
            })
          } else {
            gvar.Pane && new gvar.Pane(msg.filter)
          }
        } else if (msg.type === "ITC") {
          if (gvar.isTopFrame) {
            if (getLeaf(document, "fullscreenElement") instanceof HTMLIFrameElement) return 
          } else {
            if (!document.fullscreenElement) return 
          }
          gvar.os.itc?.stop()
          gvar.os.itc = gvar.os.itc ?? new Interactive()
          gvar.os.itc.start(msg.inits)
          reply(true)
          return 
        } else if (msg.type === "MEDIA_PROBE") {
          reply(getMediaProbe([...(gvar.os.mediaTower?.media || [])].find(m => m.gsKey === msg.key), msg.formatted))
          return 
        } else if (msg.type === "CS_ALIVE") {
          reply(true)
          return 
        } else if (msg.type === "CINEMA") {
          prepareCinema(msg.event)
          reply(true)
          return 
        }
    }
}

function prepareCinema(event: MediaEventCinema) {
  window.addEventListener("message", e => {
    if (e.data !== "CINEMA") return 
    let frame = getMatchingFrame(e.source as Window)
    frame && applyCinema(frame, event)
  }, {capture: true, once: true})
}

function getMatchingFrame(target: Window) {
  let frames = new Set<HTMLIFrameElement>()
  gvar.os.mediaTower.docs.forEach(doc => {
    let d = ((doc as Window).document ?? doc) as ShadowRoot
    d.querySelectorAll("iframe").forEach(v => frames.add(v))
  })
  return [...frames].find(f => f.contentWindow === target)
}
