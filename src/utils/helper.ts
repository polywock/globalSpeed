
// round to nearest step.
export function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step
}

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

const lowerAlpha = range(97, 97 + 26).map(n => String.fromCharCode(n))
const upperAlpha = range(65, 65 + 26).map(n => String.fromCharCode(n))
const numeric = range(10)

export function uuid(n: number, opts: {
  lowerAlpha?: boolean,
  upperAlpha?: boolean,
  numeric?: number
} = { lowerAlpha: true }) {
  let pool = [
    ...(opts.lowerAlpha ? lowerAlpha : []),
    ...(opts.upperAlpha ? upperAlpha : []),
    ...(opts.numeric ? numeric : [])
  ]
  return range(n).map(() => pool[randomInt(0, pool.length)]).join("")
}

export function uuidLowerAlpha(n: number) {
  return uuid(n, {lowerAlpha: true})
}

export function range(rb: number): number[];

export function range(lb: number, rb: number): number[] ;

export function range(lb: number, rb?: number): number[] {
  if (rb === null || rb === undefined) {
    rb = lb 
    lb = 0 
  }
  return Array(rb - lb).fill(0).map((v, i) => lb + i)  
}

export function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min))
}

export function compareArrays(a: any[], b: any[]) {
  if (a?.length === b?.length) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false 
      }
    }
    return true 
  }
  return false 
}


export function dropWhileEnd<T>(arr: T[], predicate: (v: T) => boolean): T[] {
  let dropCount = 0
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) {
      dropCount++
    } else {
      break 
    }
  }
  return dropCount === 0 ? arr.slice() : arr.slice(0, -dropCount)
}

export function stringDropWhileEnd(text: string, predicate: (v: string) => boolean): string {
  return dropWhileEnd(text.split(""), predicate).join("")
}

export function isFirefox() {
  return navigator.userAgent.includes("Firefox/")
}


