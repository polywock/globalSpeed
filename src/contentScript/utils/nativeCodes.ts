
// Used to avoid page's script 

const NATIVE_CODES = {
  dispatchEvent: EventTarget.prototype.dispatchEvent,
  addEventListener: EventTarget.prototype.addEventListener,
  stopImmediatePropagation: Event.prototype.stopImmediatePropagation,
  postMessage: window.postMessage
}

type NATIVE_TYPES = {
  dispatchEvent: EventTarget,
  addEventListener: EventTarget,
  stopImmediatePropagation: Event,
  postMessage: Window
}

export function callNative<T extends keyof typeof NATIVE_CODES>(fn: T, base: NATIVE_TYPES[T], ...args: Parameters<(typeof NATIVE_CODES)[T]>) {
  NATIVE_CODES[fn].apply(base, args)
}

