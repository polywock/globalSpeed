import { SetState } from "../types"

export function setPlaybackRate(elem: HTMLMediaElement, value: number) {
  elem.playbackRate = value 
}

export function seekMedia(elem: HTMLMediaElement, value: number, relative: boolean) {
  const newPosition = relative ? elem.currentTime + value : value 
  seekTo(elem, newPosition)
}

export function setMediaPause(elem: HTMLMediaElement, state: SetState) {
  if (state === "on" || (state === "toggle" && !elem.paused)) {
    elem.pause()
  } else {
    elem.play()
  }
}

export function setMediaMute(elem: HTMLMediaElement, state: SetState) {
  elem.muted = state === "on" ? true : state === "off" ? false : !elem.muted
}


type HTMLMediaElementSuper = HTMLMediaElement & {
  marks?: {
    [key: string]: {
      time: number,
      created: number
    }
  },
  gsLoopTimeUpdateHandler?: () => void,
  gsLoopSeekingHandler?: () => void
}

export function setMark(elem: HTMLMediaElementSuper, key: string) {
  if (!elem.readyState) return 

  elem.marks = elem.marks || {}
  elem.marks[key] = {
    time: elem.currentTime,
    created: new Date().getTime()
  }
}

export function seekMark(elem: HTMLMediaElementSuper, key: string) {
  const mark = elem.marks && elem.marks[key]
  if (mark) {
    seekTo(elem, mark.time)
  } else {
    setMark(elem, key)
  }
}

export function toggleLoop(elem: HTMLMediaElementSuper, key: string) {
  const mark = elem.marks && elem.marks[key]

  const handleRemove = () => {
    elem.removeEventListener("timeupdate", elem.gsLoopTimeUpdateHandler)
    elem.removeEventListener("seeking", elem.gsLoopSeekingHandler)
    delete elem.gsLoopTimeUpdateHandler
    delete elem.gsLoopSeekingHandler
  }

  if (elem.gsLoopTimeUpdateHandler) {
    handleRemove()
    return 
  }

  if (!mark) {
    return 
  } 

  const endTime = elem.currentTime

  elem.gsLoopTimeUpdateHandler = () => {
    if (elem.currentTime > endTime) {
      seekTo(elem, mark.time)
    }
  }

  elem.gsLoopSeekingHandler = () => {
    if (elem.currentTime < mark.time - 1 || elem.currentTime > endTime + 1) {
      handleRemove()
    }
  }

  elem.addEventListener("timeupdate", elem.gsLoopTimeUpdateHandler)
  elem.addEventListener("seeking", elem.gsLoopSeekingHandler)
}


export type MediaEventPlaybackRate = {type: "SET_PLAYBACK_RATE", value: number}
export type MediaEventSeek = {type: "SEEK", value: number, relative: boolean}
export type MediaEventPause = {type: "PAUSE", state: SetState}
export type MediaEventMute = {type: "MUTE", state: SetState}
export type MediaEventSetMark = {type: "SET_MARK", key: string}
export type MediaEventSeekMark = {type: "SEEK_MARK", key: string}
export type MediaEventToggleLoop = {type: "TOGGLE_LOOP", key: string}

export type MediaEvent = 
  MediaEventPlaybackRate | MediaEventSeek | 
  MediaEventPause | MediaEventMute | 
  MediaEventSetMark | MediaEventSeekMark | MediaEventToggleLoop


export function applyMediaEvent(elems: HTMLMediaElement[], e: MediaEvent) {
  if (e.type === "SET_PLAYBACK_RATE") {
    elems.forEach(elem => setPlaybackRate(elem, e.value))
  } else if (e.type === "SEEK") {
    elems.forEach(elem => seekMedia(elem, e.value, e.relative))
  } else if (e.type === "PAUSE") {
    elems.forEach(elem => setMediaPause(elem, e.state))
  } else if (e.type === "MUTE") {
    elems.forEach(elem => setMediaMute(elem, e.state))
  } else if (e.type === "SET_MARK") {
    elems.forEach(elem => setMark(elem, e.key))
  } else if (e.type === "SEEK_MARK") {
    elems.forEach(elem => seekMark(elem, e.key))
  } else if (e.type === "TOGGLE_LOOP") {
    elems.forEach(elem => toggleLoop(elem, e.key))
  }
}


//#region -- SET ELEM FILTER
let filteredElems: Set<HTMLElement> = new Set()
export function setElemFilter(elems: HTMLElement[], filter: string) {  
  // clear any non-reinforced elements.
  filteredElems.forEach(hot => {
    if (!elems.includes(hot)) {
      hot.style.filter = "initial"
    }
  })

  elems.forEach(v => {
    if (v.style) {
      filteredElems.add(v)
      v.style.filter = filter || ""
    }
  })
}
export function clearElemFilter() {
  (filteredElems as Set<HTMLElement>).forEach(v => {
    if (v.style) {
      v.style.filter = "none"
    }
  })  
  filteredElems.clear()
}
//#endregion

//#region -- SET ELEM TRANSFORM
let transformedElems: Set<HTMLElement> = new Set()
export function setElemTransform(elems: HTMLElement[], flipX: boolean, flipY: boolean) {  
  // clear any non-reinforced elements.
  transformedElems.forEach(hot => {
    if (!elems.includes(hot)) {
      hot.style.transformOrigin = "initial"
      hot.style.transform = "initial"
    }
  })

  elems.forEach(v => {
    if (v.style) {
      transformedElems.add(v)
      
      let transforms: string[] = []
      flipX && transforms.push("rotateY(180deg)")
      flipY && transforms.push("rotateX(180deg)")
      v.style.transformOrigin = "center center"

      v.style.transform = transforms.join(" ")
    }
  })
}
export function clearElemTransform() {
  (transformedElems as Set<HTMLElement>).forEach(v => {
    if (v.style) {
      v.style.transformOrigin = "initial"
      v.style.transform = "initial"
    }
  })  
  transformedElems.clear()
}
//#endregion

//#region -- SET DOCUMENT TRANSFORM  
let clearedDocTransform = true 
export function setDocumentTransform() {
  clearedDocTransform = false 
  if (document.documentElement.style.transform !== "rotateY(180deg)") {
    document.documentElement.style.transform = "rotateY(180deg)"
  }
  if (document.documentElement.style.transformOrigin !== "center 0px") {
    document.documentElement.style.transformOrigin = "center 0px"
  }
}
export function clearDocumentTransform() {
  if (clearedDocTransform) return 
  clearedDocTransform = true 
  document.documentElement.style.transform = "initial"
  document.documentElement.style.transformOrigin = "initial"
}
//#endregion

export const NETFLIX_URL = /^https?:\/\/[\w\d]+\.netflix\.[\d\w]+/i

function seekTo(elem: HTMLMediaElement, value: number) {
  if (NETFLIX_URL.test(document.URL)) {
    window.postMessage({type: "GS_SEEK_NETFLIX", value}, "*")
  } else {
    elem.currentTime = value
  }
}

export function injectScript(code: string) {
  const injectTag = document.createElement("script")
  injectTag.type = "text/javascript"
  injectTag.text = code 
  document.documentElement.appendChild(injectTag)
}



