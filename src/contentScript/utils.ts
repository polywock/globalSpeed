import { cachedThrottle } from "../utils/helper"
import { SetState } from "../types"



export function setMediaCurrentTime(elems: HTMLMediaElement[], value: number, relative: boolean) {
  return elems.forEach(v => {
    v.currentTime = relative ? v.currentTime + value : value 
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
      v.currentTime = mark.time
      saughtMark = true 
    } 
  })
  return saughtMark
}



let hotElems: Set<HTMLElement> = new Set()

export function setElemFilter(elems: HTMLElement[], filter: string, query: string) {  
  // clear any non-reinforced elements.
  hotElems.forEach(hot => {
    if (!elems.includes(hot)) {
      hot.style.filter = "none"
    }
  })

  elems.forEach(v => {
    if (v.style) {
      hotElems.add(v)
      v.style.filter = filter 
    }
  })
}

export function clearElemFilter() {
  (hotElems as Set<HTMLElement>).forEach(v => {
    if (v.style) {
      v.style.filter = "none"
    }
  })  
  hotElems.clear()
}
