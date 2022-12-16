import { HAS_PIP_API } from "src/utils/supports"
import { StateOption } from "../../types"
import { clamp, ceil } from "../../utils/helper"
import { IS_SPECIAL_SEEK, IS_AMAZON, IS_NETFLIX, IS_NATIVE, IS_SMART, IS_BILIBILI, IS_YOUTUBE } from "./isWebsite"


export function seek(elem: HTMLMediaElement, value: number, relative: boolean, fast?: boolean, autoPause?: boolean) {
  let newPosition = relative ? elem.currentTime + value : value 

  // If browser supports seekToNextFrame like Firefox, relative change of 0.041 will be trigger to call it. 
  if (relative && elem.seekToNextFrame && !IS_SPECIAL_SEEK && Math.abs(value) === 0.041) {
    elem.paused || elem.pause()
    if (value < 0) {
      newPosition = elem.currentTime - (elem.gsFrameSpan ?? 0.04)
    } else {
      let pre = elem.currentTime
      elem.seekToNextFrame().then(() => {
        elem.gsFrameSpan = ceil(elem.currentTime - pre, 4)
        if (elem.gsFrameSpan > 1 / 20 || elem.gsFrameSpan < 1 / 65) {
          elem.gsFrameSpan = 0.04
        }
      })
      return 
    }
  }

  seekTo(elem, newPosition, fast, autoPause)
}

export function seekPercentage(elem: HTMLMediaElement, value: number, fast?: boolean, autoPause?: boolean) {
  if (Math.abs(elem.duration) === Infinity) return 
  seekTo(elem, elem.duration * value, fast, autoPause)
}

function seekTo(elem: HTMLMediaElement, value: number, fast?: boolean, autoPause?: boolean) {
  // fast seek is not precise for small changes.
  if (fast && (value < 10 || Math.abs(elem.currentTime - value) < 3)) {
    fast = false 
  }
  
  const paused = elem.paused 
  autoPause && elem.pause()

  if (IS_NETFLIX) {
    gvar.mediaTower.server.send({
      type: "SEEK_NETFLIX", 
      value
    })
    return 
  } 

  if (fast && elem.fastSeek) {
    elem.fastSeek(value)
  } else {
    elem.currentTime = value
  }

  if (IS_AMAZON && !autoPause) {
    paused ? elem.play() : elem.pause() 
    paused ? elem.pause() : elem.play() 
  }
}

export function setPause(elem: HTMLMediaElement, state: StateOption) {
  if (state === "on" || (state === "toggle" && !elem.paused)) {
    elem.pause()
  } else {
    elem.play()
  }
}

export function setMute(elem: HTMLMediaElement, state: StateOption) {
  elem.muted = state === "on" ? true : state === "off" ? false : !elem.muted
}

export function setVolume(elem: HTMLMediaElement, value: number, relative: boolean) {
  elem.volume = clamp(0, 1, relative ? elem.volume + value : value)
}


export function setMark(elem: HTMLMediaElement, key: string) {
  if (!elem.readyState) return 

  elem.gsMarks = elem.gsMarks || {}
  elem.gsMarks[key] = elem.currentTime
  gvar.mediaTower.sendUpdate()
}

export function seekMark(elem: HTMLMediaElement, key: string, fast?: boolean) {
  const markTime = elem.gsMarks?.[key]
  if (markTime == null) {
    setMark(elem, key)
  } else {
    seekTo(elem, markTime, fast)
  }
}

function findNameless(arr: number[], currentTime: number, mode: "N" | "P" | "C") {
  let closest: {index: number, diff: number}

  arr.forEach((v, index) => {
    if (mode === "N" && v <= currentTime) return 
    if (mode === "P" && v >= currentTime) return 

    let diff = Math.abs(currentTime - v) 
    if (!closest || diff < closest.diff) {
      closest = {index, diff}
    }
  })

  if (!closest) {
    if (mode === "N" && arr.length) {
      closest = {index: 0, diff: Math.abs(currentTime - arr[0])}
    }
    if (mode === "P" && arr.length) {
      closest = {index: arr.length - 1, diff: Math.abs(currentTime - arr[arr.length - 1])}
    }
  }
  return closest 
}


function setNameless(elem: HTMLMediaElement) {
  elem.gsNameless = elem.gsNameless || []
  const nameless = elem.gsNameless

  // if any marks close enough, remove. 
  const closest = findNameless(nameless, elem.currentTime, "C")
  if (closest?.diff <= 1) {
    nameless.splice(closest.index, 1)
    return 
  }

  nameless.push(elem.currentTime)
}

function jumpNameless(elem: HTMLMediaElement, next?: boolean) {
  elem.gsNameless = elem.gsNameless || []
  let closest = findNameless(elem.gsNameless, elem.currentTime - (next ? 0 : 1), next ? "N" : "P")
  if (closest) {
    seekTo(elem, elem.gsNameless[closest.index])
  }
}

export function toggleLoop(elem: HTMLMediaElement, key: string) {
  let markTime = elem.gsMarks?.[key]

  const handleRemove = () => {
    elem.removeEventListener("timeupdate", elem.gsLoopTimeUpdateHandler, true)
    elem.removeEventListener("seeking", elem.gsLoopSeekingHandler, true)
    delete elem.gsLoopTimeUpdateHandler
    delete elem.gsLoopSeekingHandler
    gvar.mediaTower.sendUpdate()
  }

  if (elem.gsLoopTimeUpdateHandler) {
    handleRemove()
    return 
  }

  if (markTime == null) {
    return 
  } 

  let endTime = elem.currentTime

  // make unidirectional 
  if (markTime > endTime) {
    [markTime, endTime] = [endTime, markTime]
  }

  elem.gsLoopTimeUpdateHandler = () => {
    if (elem.currentTime > endTime) {
      seekTo(elem, markTime)
    }
  }

  elem.gsLoopSeekingHandler = () => {
    if (elem.currentTime < markTime - 2 || elem.currentTime > endTime + 2) {
      handleRemove()
    }
  }

  elem.addEventListener("timeupdate", elem.gsLoopTimeUpdateHandler, {capture: true, passive: true})
  elem.addEventListener("seeking", elem.gsLoopSeekingHandler, {capture: true, passive: true})

  gvar.mediaTower.sendUpdate()
}

function togglePip(elem: HTMLVideoElement, state: StateOption = "toggle") {
  if (!HAS_PIP_API) return 
  let exit = state === "off"
  if (state === "toggle" && (elem.getRootNode() as any as DocumentOrShadowRoot).pictureInPictureElement === elem) {
    exit = true 
  }

  if (exit) {
    document.exitPictureInPicture()
  } else {
    if (!elem.isConnected) return 
    elem.removeAttribute("disablePictureInPicture")
    elem.requestPictureInPicture?.().catch(err => {
      if (err?.name === "SecurityError" && err?.message.includes("permissions policy")) {
        alert("PiP blocking detected. To circumvent, try my 'PiP Unblocker' extension.")
      }
    })
  }
}

const RATE_LIMIT_PERIOD = 1000 * 60 
const RATE_LIMIT = 200 
const RATE_LIMIT_BREAK = 3 


class SetPlaybackRate {
  static rateTracker: {time: number, count: number}
  static rateLimitPassed = 0 
  static rateLimitBroken = false 
  static checkLimited() {
    if (this.rateLimitBroken) return true  

    const time = Math.ceil(new Date().getTime() / RATE_LIMIT_PERIOD) * RATE_LIMIT_PERIOD
    if (SetPlaybackRate.rateTracker?.["time"] === time) {
      if (++SetPlaybackRate.rateTracker["count"] > RATE_LIMIT) {
        if (++SetPlaybackRate.rateLimitPassed >= RATE_LIMIT_BREAK) {
          SetPlaybackRate.rateLimitBroken = true 
        }
        return true 
      } 
    } else {
      SetPlaybackRate.rateTracker = {time, count: 1}
    }
    return false 
  }
  static _set(elem: HTMLMediaElement, value: number, freePitch?: boolean) {
    if (SetPlaybackRate.checkLimited()) return 
    value = clamp(0.0625, 16, value)
    try {
      if (elem.playbackRate.toFixed(3) !== value.toFixed(3)) {
        elem.playbackRate = value
      }
    } catch (err) {}

    try {
      if (elem.defaultPlaybackRate.toFixed(3) !== value.toFixed(3)) {
        elem.defaultPlaybackRate = value
      }
    } catch (err) {}

    elem.preservesPitch = !freePitch
    elem.mozPreservesPitch = !freePitch
    elem.webkitPreservesPitch = !freePitch
  }
  static _setYt(elem: HTMLMediaElement, value: number, freePitch?: boolean) {
    if (elem.hasAttribute("yss-skip")) return 
    this._set(elem, value, freePitch)
  }
  static set = IS_YOUTUBE ? SetPlaybackRate._setYt : SetPlaybackRate._set
}


function applyFullscreen(elem: HTMLVideoElement, native: boolean) {
  if (IS_BILIBILI && !native) {
    let control = document.querySelector(".bilibili-player-video-btn-fullscreen") as HTMLButtonElement
    if (control) {
      control.click()
      return 
    }
  }
  if (IS_YOUTUBE && !native) {
    let control = document.querySelector(".ytp-fullscreen-button.ytp-button") as HTMLButtonElement
    if (control) {
      control.click()
      return 
    }
  }

  if (IS_NATIVE && (native || !IS_SMART)) {
    gvar.nativeFs.toggleSafe(elem as HTMLVideoElement)
  } else if (IS_SMART && (!native || !IS_NATIVE)) {
    gvar.smartFs.toggleSafe(elem as HTMLVideoElement)
  }
}

export function applyMediaEvent(elem: HTMLMediaElement, e: MediaEvent) {
  if (!elem) return 
  if (e.type === "PLAYBACK_RATE") {
    SetPlaybackRate.set(elem, e.value, e.freePitch)
  } else if (e.type === "SEEK") {
    if (e.percent) {
      seekPercentage(elem, e.value, e.fast, e.autoPause)
      return 
    }
    seek(elem, e.value, e.relative, e.fast, e.autoPause)
  } else if (e.type === "PAUSE") {
    setPause(elem, e.state)
  } else if (e.type === "MUTE") {
    setMute(elem, e.state)
  } else if (e.type === "SET_VOLUME") {
    setVolume(elem, e.value, e.relative)
  } else if (e.type === "SET_MARK") {
    let lowerCaseKey = (e.key || "").toLowerCase()
    if (e.key === "::nameless") {
      setNameless(elem)
    } else if (lowerCaseKey === "::nameless-prev") {
      jumpNameless(elem)
    } else if (lowerCaseKey === "::nameless-next") {
      jumpNameless(elem, true)
    } else {
      setMark(elem, e.key)
    }
    
  } else if (e.type === "SEEK_MARK") {
    seekMark(elem, e.key, e.fast)
  } else if (e.type === "TOGGLE_LOOP") {
    toggleLoop(elem, e.key)
  } else if (e.type === "PIP") {
    togglePip(elem as HTMLVideoElement, e.state)
  } else if (e.type === "FULLSCREEN") {
    applyFullscreen(elem as HTMLVideoElement, e.direct)
  }
}

export type MediaEventPlaybackRate = {type: "PLAYBACK_RATE", value: number, freePitch: boolean}
export type MediaEventSeek = {type: "SEEK", value: number, relative?: boolean, fast?: boolean, autoPause?: boolean, percent?: boolean}
export type MediaEventPause = {type: "PAUSE", state: StateOption}
export type MediaEventMute = {type: "MUTE", state: StateOption}
export type MediaEventSetVolume = {type: "SET_VOLUME", value: number, relative: boolean}
export type MediaEventSetMark = {type: "SET_MARK", key: string}
export type MediaEventSeekMark = {type: "SEEK_MARK", key: string, fast: boolean}
export type MediaEventToggleLoop = {type: "TOGGLE_LOOP", key: string}
export type MediaEventTogglePip = {type: "PIP", state?: StateOption}
export type MediaEventToggleFs = {type: "FULLSCREEN", direct?: boolean}

export type MediaEvent = 
  MediaEventPlaybackRate | MediaEventSeek | MediaEventPause | MediaEventMute | MediaEventSetVolume |
  MediaEventSetMark | MediaEventSeekMark | MediaEventToggleLoop | MediaEventTogglePip | MediaEventToggleFs
