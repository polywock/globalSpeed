import { SetState } from "../types"



export function setMediaCurrentTime(elems: HTMLMediaElement[], value: number, relative: boolean) {
  return elems.forEach(v => {
    const newPosition = relative ? v.currentTime + value : value 
    seekTo(v, newPosition)
  })
}

export function setMediaPause(elems: HTMLMediaElement[], state: SetState) {
  return elems.forEach(v => {
    if (state === "on" || (state === "toggle" && !v.paused)) {
      v.pause()
    } else {
      v.play()
    }
  })
}

export function setMediaMute(elems: HTMLMediaElement[], state: SetState) {
  return elems.forEach(v => {
    v.muted = state === "on" ? true : state === "off" ? false : !v.muted
  })
}




type HTMLMediaElementSuper = HTMLMediaElement & {
  marks?: {
    [key: string]: {
      time: number,
      created: number
    }
  }
}

export function setMark(elems: HTMLMediaElementSuper[], key: string) {
  let marksMade: {}[] = [];

  elems.forEach(v => {
    if (v.ended && !v.isConnected) {
      return 
    }

    v.marks = v.marks || {}
    let newMark = {
      time: v.currentTime,
      created: new Date().getTime()
    }

    v.marks[key] = newMark
    marksMade.push(marksMade)
  })

  return marksMade
}

export function seekMark(elems: HTMLMediaElementSuper[], key: string) {
  let saughtMark = false;
  elems.forEach(v => {
    if (!v.isConnected) {
      return 
    }

    const mark = v.marks?.[key]
    if (mark) {
      seekTo(v, mark.time)
      saughtMark = true 
    } 
  })
  return saughtMark
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

function seekTo(elem: HTMLMediaElement, position: number) {
  if (NETFLIX_URL.test(document.URL)) {
    window.postMessage({type: "SEEK_NETFLIX", position}, "*")
  } else {
    elem.currentTime = position
  }
}

export function injectScript(code: string) {
  const injectTag = document.createElement("script")
  injectTag.type = "text/javascript"
  injectTag.text = code 
  document.body.appendChild(injectTag)
}


