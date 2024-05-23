
// Store native functions because some websites override them. 
// Annoying to use this way, but may be worth it to save debugging time. 
export const native = {
  dispatchEvent: EventTarget.prototype.dispatchEvent,
  stopImmediatePropagation: Event.prototype.stopImmediatePropagation,
  appendChild: Node.prototype.appendChild,
  map: {
    clear: Map.prototype.clear,
    set: Map.prototype.set,
    has: Map.prototype.has,
    get: Map.prototype.get
  },
  array: {
    push: Array.prototype.push,
    includes: Array.prototype.includes,
  },
  Map,
  ShadowRoot,
  HTMLMediaElement,
  CustomEvent,
  JSON: {
    parse: JSON.parse,
    stringify: JSON.stringify
  }
}