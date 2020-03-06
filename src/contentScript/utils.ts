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
    if (elem.currentTime < mark.time || elem.currentTime > endTime) {
      handleRemove()
    }
  }

  elem.addEventListener("timeupdate", elem.gsLoopTimeUpdateHandler)
  elem.addEventListener("seeking", elem.gsLoopSeekingHandler)
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



