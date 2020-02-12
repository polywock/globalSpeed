import { cachedThrottle } from "../utils/helper"
import { SetState } from "../types"


const getShadowHostsThrottled = cachedThrottle(getShadowHosts, 5000)
const querySelectorThrottled = cachedThrottle(querySelector, 500)


function querySelector(recursive: boolean, query: string) {
  let elems: Element[] = []
  let docs: (Document | ShadowRoot)[] = [document] 

  if (recursive) {
    docs.push(...getShadowHostsThrottled(document))
  }

  docs.forEach(doc => {
    elems.push(...doc.querySelectorAll(query))
  })

  return elems 
}


export function getShadowHosts(doc: Document | ShadowRoot) {
  let roots: ShadowRoot[] = []

  doc.querySelectorAll("*").forEach(node => {
    if (node.shadowRoot && node.shadowRoot.mode === "open") {
      roots.push(node.shadowRoot)
      roots.push(...getShadowHosts(node.shadowRoot))
    }
  })
  return roots 
}


function getMedia(recursive: boolean) {
  if (recursive) {
    return querySelector(true, "video, audio") as HTMLMediaElement[]
  } else {
    const vids = Array.from(document.getElementsByTagName("video")) as HTMLMediaElement[]
    const auds = Array.from(document.getElementsByTagName("audio")) as HTMLMediaElement[]
    return vids.concat(auds)
  }
}


export function checkIfMedia(recursive: boolean) {
  return getMedia(recursive).length > 0
}

export function setMediaSpeed(recursive: boolean, playbackRate: number) {
  return getMedia(recursive).forEach(v => {
    v.playbackRate = playbackRate
  })
}

export function setMediaCurrentTime(recursive: boolean, value: number, relative: boolean) {
  return getMedia(recursive).forEach(v => {
    v.currentTime = relative ? v.currentTime + value : value 
  })
}

export function setMediaPause(recursive: boolean, state: SetState) {
  return getMedia(recursive).forEach(v => {
    if (state === "on" && !v.paused) {
      v.pause()
    } else if (state === "off" && v.paused) {
      v.play()
    } else if (state === "toggle") {
      if (v.paused) {
        v.play()
      } else {
        v.pause()
      }
    }
  })
}

export function setMediaMute(recursive: boolean, state: SetState) {
  return getMedia(recursive).forEach(v => {
    v.muted = state === "on" ? true : state === "off" ? false : !v.muted
  })
}




type HTMLMediaElementSuper = HTMLMediaElement & {
  marks: {
    [key: string]: {
      time: number,
      created: number
    }
  }
}

export function setMark(recursive: boolean, key: string) {
  let marksMade: {}[] = [];

  (getMedia(recursive) as HTMLMediaElementSuper[]).forEach(v => {
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

export function seekMark(recursive: boolean, key: string) {
  let saughtMark = false;
  (getMedia(recursive) as HTMLMediaElementSuper[]).forEach(v => {
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

export function setElemFilter(recursive: boolean, filter: string, query: string) {
  let elems: HTMLElement[] = []
  try {
    elems = (querySelectorThrottled(recursive, query) as HTMLElement[])
  } catch (err) {}

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


