import { StateOption } from "../../types"
import { clamp } from "../../utils/helper"


export function seek(elem: HTMLMediaElement, value: number, relative: boolean) {
  const newPosition = relative ? elem.currentTime + value : value 
  seekTo(elem, newPosition)
}

function seekTo(elem: HTMLMediaElement, value: number) {
  if (document.URL.startsWith("https://www.netflix.com")) {
    window.mediaTower.talk.send({
      type: "SEEK_NETFLIX", 
      value
    })
  } else {
    elem.currentTime = value
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

  // first time, add listener to clear them.
  if (!elem.gsMarks) {
    elem.addEventListener("unload", e => {
      delete elem.gsMarks
    }, {passive: true, capture: true, once: true})
  }

  elem.gsMarks = elem.gsMarks || {}
  elem.gsMarks[key] = elem.currentTime
  window.mediaTower.sendUpdate()
}

export function seekMark(elem: HTMLMediaElement, key: string) {
  const markTime = elem.gsMarks?.[key]
  if (markTime == null) {
    setMark(elem, key)
  } else {
    seekTo(elem, markTime)
  }
}

export function toggleLoop(elem: HTMLMediaElement, key: string) {
  let markTime = elem.gsMarks?.[key]

  const handleRemove = () => {
    elem.removeEventListener("timeupdate", elem.gsLoopTimeUpdateHandler, true)
    elem.removeEventListener("seeking", elem.gsLoopSeekingHandler, true)
    delete elem.gsLoopTimeUpdateHandler
    delete elem.gsLoopSeekingHandler
    window.mediaTower.sendUpdate()
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

  window.mediaTower.sendUpdate()
}

function togglePip(elem: HTMLVideoElement) {
  if ((elem.getRootNode() as any as DocumentOrShadowRoot).pictureInPictureElement === elem) {
    document.exitPictureInPicture()
  } else {
    elem.removeAttribute("disablePictureInPicture");
    elem.requestPictureInPicture()
  }
}

function setPlaybackRate(elem: HTMLMediaElement, value: number, freePitch?: boolean) {
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

export function applyMediaEvent(elem: HTMLMediaElement, e: MediaEvent) {
  if (e.type === "PLAYBACK_RATE") {
    setPlaybackRate(elem, e.value, e.freePitch)
  } else if (e.type === "SEEK") {
    seek(elem, e.value, e.relative)
  } else if (e.type === "PAUSE") {
    setPause(elem, e.state)
  } else if (e.type === "MUTE") {
    setMute(elem, e.state)
  } else if (e.type === "SET_VOLUME") {
    setVolume(elem, e.value, e.relative)
  } else if (e.type === "SET_MARK") {
    setMark(elem, e.key)
  } else if (e.type === "SEEK_MARK") {
    seekMark(elem, e.key)
  } else if (e.type === "TOGGLE_LOOP") {
    toggleLoop(elem, e.key)
  } else if (e.type === "TOGGLE_PIP") {
    togglePip(elem as HTMLVideoElement)
  }
}

export type MediaEventPlaybackRate = {type: "PLAYBACK_RATE", value: number, freePitch: boolean}
export type MediaEventSeek = {type: "SEEK", value: number, relative: boolean}
export type MediaEventPause = {type: "PAUSE", state: StateOption}
export type MediaEventMute = {type: "MUTE", state: StateOption}
export type MediaEventSetVolume = {type: "SET_VOLUME", value: number, relative: boolean}
export type MediaEventSetMark = {type: "SET_MARK", key: string}
export type MediaEventSeekMark = {type: "SEEK_MARK", key: string}
export type MediaEventToggleLoop = {type: "TOGGLE_LOOP", key: string}
export type MediaEventTogglePip = {type: "TOGGLE_PIP"}

export type MediaEvent = 
  MediaEventPlaybackRate | MediaEventSeek | MediaEventPause | MediaEventMute | MediaEventSetVolume |
  MediaEventSetMark | MediaEventSeekMark | MediaEventToggleLoop | MediaEventTogglePip
