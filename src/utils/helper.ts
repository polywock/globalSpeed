type AnyDict = {[key: string]: any}

export function clamp(min: number, max: number, value: number) {
  let clamped = value 
  if (min != null) {
    clamped = Math.max(min, clamped)
  }
  if (max != null) {
    clamped = Math.min(max, clamped)
  }
  return clamped 
}

export function between(min: number, max: number, value: number) {
  return value >= min && value <= max
}

export function wraparound(min: number, max: number, value: number) {
  const delta = max - min + 0.00000000001 
  if (max < min) {
    [min, max] = [max, min]
  }
  if (value < min) {
    return round((max - (min - value) % delta), 6)
  }
  if (value > max) {
    return round(min + (value - max) % delta, 6)
  }
  return value 
}

export function round(value: number, precision: number): number {
	const scalar = 10 ** precision
	return Math.round(value * scalar) / scalar
}

export function roundTo(value: number, nearest: number): number {
	return round(Math.round(value / nearest ) * nearest, 6)
}

export function ceil(value: number, precision: number): number {
	const scalar = 10 ** precision
	return round(Math.ceil(value * scalar) / scalar, 8)
}

export function randomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min 
}

export function randomId() {
  return Math.ceil(Math.random() * 1E10).toString()
}

let isFirefoxResult: boolean
export function isFirefox() {
  isFirefoxResult = isFirefoxResult ?? navigator.userAgent.includes("Firefox/")
  return isFirefoxResult
}

let firefoxVersionResult: number = undefined
export function getFirefoxVersion() {
  if (firefoxVersionResult !== undefined) return firefoxVersionResult
  firefoxVersionResult = null
  const firefoxInfo = navigator.userAgent.split(" ").find(v => v.includes("Firefox/"))
  if (firefoxInfo) {
    const version = parseInt(firefoxInfo.slice(8))
    if (version > 1) {
      firefoxVersionResult = version 
    }
  }
  return firefoxVersionResult
}

let isEdgeResult: boolean
export function isEdge() {
  isEdgeResult = isEdgeResult ?? navigator.userAgent.includes("Edg")
  return isEdgeResult
}

let isMobileResult: boolean
export function isMobile() {
  if (isMobileResult != null) return isMobileResult
  let data = (navigator as any).userAgentData
  if (data) {
    isMobileResult = data.mobile 
    return isMobileResult
  }
  isMobileResult = /Mobi|Android|iPhone/i.test(navigator.userAgent)
  return isMobileResult
}

export function chunkByPredicate<T>(arr: T[], predicate: (v: T) => boolean) {
  let passed: T[] = []
  let failed: T[] = [] 
  arr.forEach(v => {
    if (predicate(v)) {
      passed.push(v)
    } else {
      failed.push(v)
    }
  })
  return [passed, failed] 
}


export function formatDomain(domain: string) {
  let separated = domain.split(/\./g)
  if (separated.length < 3) return domain 
  let [sd, d, tld] = separated
  
  let parts: string[] = [d, tld]
  if (sd !== "www") {
    parts.unshift(sd)
  } 
  return parts.join(".")
}

export function formatDuration(secs: number, includePositive?: boolean) {
  let prefix = secs < 0 ? '-' : (includePositive ? '+' : '')
  secs = Math.abs(secs)
  const mins = secs / 60  
  const hours = mins / 60 

  if (hours >= 100) {
    return ""
  } else if (hours > 1) {
    return `${prefix}${Math.floor(hours)}:${Math.floor((mins % 60)).toString().padStart(2, "0")}:${Math.floor((secs % 60)).toString().padStart(2, "0")}`
  } else {
    return `${prefix}${Math.floor(mins).toString().padStart(1, "0")}:${Math.floor((secs % 60)).toString().padStart(2, "0")}`
  } 
}

export function formatDurationMinimal(secs: number) {
  if (secs < 60) return round(secs, 2)
  return formatDuration(secs)
}

export function formatFreq(value: number) {
  if (value >= 1000) {
    return `${round(value / 1000, 1)}kHz`
  }
  return `${Math.round(value)}hz`
}

export function moveItem<T>(list: T[], test: ((v: T) => boolean) | number, to: "D" | "U" | number) {
  let idx = typeof test === "number" ? test : list.findIndex(test)
  let item = list[idx]
  let newIdx: number 
  if (typeof to === "number") {
    newIdx = clamp(0, list.length - 1, to)
  } else {
    const down = to === "D"
    newIdx = clamp(0, list.length - 1, idx + (down ? 1 : -1))
  }
  list.splice(idx, 1)
  list.splice(newIdx, 0, item)
  return idx 
}

export function lerp(lb: number, rb: number, normal: number) {
  return lb + normal * (rb - lb)
}

export function inverseLerp(lb: number, rb: number, value: number) {
  return (value - lb) / (rb - lb)
}

export function freqToLinear(freq: number) {
  return Math.log2(freq / 440)
}

const chromatic = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];

export function linearToChromatic(linear: number): string {
  return chromatic[(Math.round(linear * 12) + (12 * 1000)) % 12]  
}

export function areYouSure() {
  return confirm(gvar.gsm.options.help.areYouSure)
}

export function feedbackText(text: string, pos?: {x?: number, y?: number}, decay?: number) {
  const div = document.createElement("div")
  if ((window as any).feedbackDiv) {
    (window as any).feedbackDiv.remove( )
  }
  let darkTheme = document.documentElement.classList.contains('darkTheme')
  ;(window as any).feedbackDiv = div 
  div.textContent = text 
  div.setAttribute(`style`, `
    position: fixed;
    left: ${pos?.x || 0}px;
    top: ${pos?.y || 0}px;
    background-color: ${darkTheme ? 'white' : 'black'}; 
    color: ${darkTheme ? 'black' : 'white'};
    padding: 10px;
    z-index: 99999999999;
    white-space: break-spaces;
  `)
  document.body.appendChild(div)
  if (pos?.x == null || pos?.y == null) {
    let b = div.getBoundingClientRect()
    if (pos?.x == null) div.style.left = `calc((100vw - ${b.width}px) / 2)`
    if (pos?.y == null) div.style.top = `calc((100vh - ${b.height}px) / 2)`
  }

  window.addEventListener('pointerdown', e => {
    div.remove()
  }, {once: true})

  window.addEventListener('wheel', e => {
    div.remove()
  }, {once: true})

  setTimeout(() => {
    div.remove()
  }, decay || 1000)
}

export function groupByKey<T>(items: T[], getKey: (v: T) => any): T[][] {
  let map = new Map<any, T[]>()

  for (let item of items) {
    const key = getKey(item)
    const arr = map.get(key) ?? []
    arr.push(item)
    map.set(key, arr)
  }

  const groups: T[][] = []
  map.forEach(v => {
    groups.push(v)
  })

  return groups 
}

export function flatJoin<T>(groups: T[][], value: T) {
  let flatGroup: T[] = []
  let flag = false 
  for (let group of groups) {
    if (flag) {
      flatGroup.push(value)
      flag = false 
    }
    flatGroup = [...flatGroup, ...group]
    flag = true 
  }
  return flatGroup
}


export function domRectGetOffset(rect: DOMRect, xOffset = 10, yOffset = 10, topLeft?: boolean) {
  if (topLeft) return {x: rect.x + xOffset, y: rect.y - yOffset}
  return {x: rect.x + rect.width + xOffset, y: rect.y - rect.height - yOffset}
}


export function speak(text: string) {
  let utter = new SpeechSynthesisUtterance(text)
  utter.lang = "en"
  speechSynthesis.speak(utter)
}

export function assertType<T>(value: any): asserts value is T { }

/** Very limited comparison */
export function deepEqual(a: any, b: any) {
  if (a === b) return true

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false
  }

  const keysA = Object.keys(a)

  if (keysA.length !== Object.keys(b).length) return false

  for (const key of keysA) {
    if (!b.hasOwnProperty(key)) return false
    if (!deepEqual(a[key], b[key])) return false
  }

  return true
}

export function timeout(ms: number) {
  return new Promise((res, rej) => {
    setTimeout(() => res(true), ms)
  })
}

export function pickObject(obj: AnyDict, keys: string[]) {
  let newObj = {} as AnyDict
  for (let key of keys) {
    if (Object.hasOwn(obj, key)) {
      newObj[key] = obj[key]
    }
  }
  return newObj
}

export function listToDict<V>(arr: string[], val: V): {[key: string]: V} {
  return Object.fromEntries(arr.map(k => [k, val]))
}

export function removeFromArray<V>(arr: V[], val: V) {
  const idx = arr.indexOf(val)
  if (idx >= 0) {
    arr.splice(idx, 1)
  }
}

export function findRemoveFromArray<V>(arr: V[], test: (v: V) => boolean) {
  const idx = arr.findIndex(test)
  if (idx >= 0) {
    arr.splice(idx, 1)
  }
}

export function createElement(v: string) {
  let div = document.createElement("div")
  div.innerHTML = v 
  return div.children[0]
}

export function getPopupSize() {
  if (!screen) return {width: 1000, height: 800, left: 200, top: 200}

  const width = Math.min(screen.width - 100, 1000)
  const height = Math.min(screen.height - 100, 800)
  return {
      width,
      height,
      left: screenLeft + (screen.width - width) / 2,
      top: screenTop + (screen.height - height) / 2
  }
}

export function extractClient(e: PointerEvent | TouchEvent | MouseEvent) {
  let clientX: number 
  let clientY: number 
  if (globalThis.TouchEvent && e instanceof globalThis.TouchEvent) {
      if (e.touches[0]) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.changedTouches[0]?.clientX
        clientY = e.changedTouches[0]?.clientY
      }
  } else {
      clientX = (e as PointerEvent).clientX; 
      clientY = (e as PointerEvent).clientY
  }
  return {clientX, clientY}
}