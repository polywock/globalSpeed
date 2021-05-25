

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

export function round(value: number, precision: number): number {
	const scalar = 10 ** precision
	return Math.round(value * scalar) / scalar
}

export function ceil(value: number, precision: number): number {
	const scalar = 10 ** precision
	return Math.ceil(value * scalar) / scalar
}

export function randomId() {
  return Math.ceil(Math.random() * 1E10).toString()
}

export function findAndRemove<T>(arr: T[], test: (v: T) => boolean) {
  const idx = arr.findIndex(v => test(v))
  if (idx >= 0) {
    arr.splice(idx, 1)
    return arr[idx]
  }
  return null
}


let isFirefoxResult: boolean

export function isFirefox() {
  if (isFirefoxResult == null) {
    isFirefoxResult = navigator.userAgent.includes("Firefox/")
  }
  return isFirefoxResult
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

export function formatDuration(secs: number) {
  const mins = secs / 60  
  const hours = mins / 60 

  if (hours >= 100) {
    return ""
  } else if (hours > 1) {
    return `${Math.floor(hours)}:${Math.floor((mins % 60)).toString().padStart(2, "0")}:${Math.floor((secs % 60)).toString().padStart(2, "0")}`
  } else {
    return `${Math.floor(mins).toString().padStart(1, "0")}:${Math.floor((secs % 60)).toString().padStart(2, "0")}`
  } 
}

export function formatFreq(value: number) {
  if (value >= 1000) {
    return `${round(value / 1000, 1)}kHz`
  }
  return `${Math.round(value)}hz`
}

export function moveItem<T>(list: T[], test: (v: T) => boolean, down?: boolean) {
  let idx = list.findIndex(test)
  let item = list[idx]
  let newIdx = clamp(0, list.length - 1, idx + (down ? 1 : -1))
  list.splice(idx, 1)
  list.splice(newIdx, 0, item)
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

type Primitive = number | string | boolean | Primitive[] | {[key: string]: Primitive}

export function compareJson(lhs: Primitive, rhs: Primitive) {
  try {
    return JSON.stringify(lhs || {}) === JSON.stringify(rhs || {})
  } catch (err) {}
  return false 
}

export function areYouSure() {
  return confirm(window.gsm.options.help.areYouSure)
}

export function feedbackText(text: string, pos: {x: number, y: number}, decay?: number) {
  const div = document.createElement("div")
  div.textContent = text 
  div.setAttribute(`style`, `
    position: fixed;
    left: ${pos.x}px;
    top: ${pos.y}px;
    background-color: blue; 
    color: yellow;
    padding: 10px;
    z-index: 99999999999;
  `)
  document.body.appendChild(div)

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


export function domRectGetOffset(rect: DOMRect, offset = 10) {
  return {x: rect.x + rect.width + offset, y: rect.y - rect.height - offset}
}

    
export function intersect<T, B>(lhs: T[], rhs: B[]) {
  lhs = lhs || [] 
  rhs = rhs || []
  const arr = [] as T[]
  lhs.forEach(v => {
    if (rhs.includes(v as any)) arr.push(v)
  })
  return arr
}

export function speak(text: string) {
  let utter = new SpeechSynthesisUtterance(text)
  utter.lang = "en"
  speechSynthesis.speak(utter)
}