
import debounce from "lodash.debounce"

/** Used to maintain a reference to all shadow roots */
export class PollShadowRoots {
  shadowRoots: ShadowRoot[] = []
  intervalId: number 
  listeners: Set<(added: ShadowRoot[], removed: ShadowRoot[]) => void> = new Set()
  released = false 
  constructor() {
    this.intervalId = setInterval(this.handleInterval, 15E3) 
    this.handleInterval()
    window.addEventListener("message", this.handleMessage)
  }
  release = () => {
    if (this.released) return 
    this.released = true 
    this.handleIntervalDebounced?.cancel()
    delete this.handleIntervalDebounced
    clearInterval(this.intervalId)
    delete this.shadowRoots
    delete this.listeners
  }
  handleMessage = ({data}: MessageEvent) => {
    if (data.type === "ATTACHED_SHADOW") {
      this.handleIntervalDebounced()
      this.handleIntervalDebounced()
    }
  }
  handleInterval = () => {
    const newShadowRoots = walkTreeForShadowRoots(document.body)
    
    const removed: ShadowRoot[] = []
    this.shadowRoots = this.shadowRoots.filter(root => {
      if (newShadowRoots.includes(root)) {
        return true 
      } 
      removed.push(root)
      return false 
    })
    
    const added: ShadowRoot[] = []
    newShadowRoots.forEach(root => {
      if (this.shadowRoots.includes(root)) {
        return 
      } else {
        added.push(root)
        this.shadowRoots.push(root)
      }
    })

    if (added.length + removed.length > 0) {
      this.listeners.forEach(listener => {
        listener(added, removed)
      })
    }
  }
  handleIntervalDebounced = debounce(this.handleInterval, 1000, {leading: true, trailing: true, maxWait: 3000})
  
  static common: PollShadowRoots
  static referenceCount = 0
  static getCommon() {
    PollShadowRoots.referenceCount++
    PollShadowRoots.common = PollShadowRoots.common || new PollShadowRoots()
    return PollShadowRoots.common 
  }
  static releaseCommon() {
    PollShadowRoots.referenceCount--
    if (PollShadowRoots.referenceCount <= 0) {
      PollShadowRoots.common.release()
      delete PollShadowRoots.common
    }
  }
}


export function walkTreeForShadowRoots(ctx: Element | DocumentFragment, arr: ShadowRoot[] = []) {
  if ((ctx as Element).shadowRoot?.mode === "open") {
   arr.push((ctx as Element).shadowRoot) 
   walkTreeForShadowRoots((ctx as Element).shadowRoot, arr)
  }
  ctx = ctx.firstElementChild
  if (!ctx) return arr 
  walkTreeForShadowRoots(ctx, arr)
  while (ctx = ctx.nextElementSibling) {
    walkTreeForShadowRoots(ctx, arr)
  }
  return arr 
}
