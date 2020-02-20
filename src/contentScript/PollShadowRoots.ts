


/** Used to maintain a reference to all shadow roots */
export class PollShadowRoots {
  shadowRoots: ShadowRoot[] = []
  intervalId: number 
  listeners: Set<(added: ShadowRoot[], removed: ShadowRoot[]) => void> = new Set()
  elapsed = 0
  released = false 
  constructor() {
    document.addEventListener("visibilitychange", this.handleVisibilityChange)
    this.handleVisibilityChange()
  }
  release = () => {
    if (this.released) return 
    this.released = true 
    document.removeEventListener("visibilitychange", this.handleVisibilityChange)
    clearInterval(this.intervalId)
    delete this.shadowRoots
    delete this.listeners
  }
  handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      if (this.intervalId == null) {
        this.intervalId = setInterval(this.handleInterval, 5000)
      }
    } else {
      clearInterval(this.intervalId)
    }
  }
  handleInterval = () => {
    const oldTime = new Date().getTime()
    const newShadowRoots = getShadowRoots(document)
    
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

    this.elapsed += new Date().getTime() - oldTime

  }
  
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

export function getShadowRoots(doc: Document | ShadowRoot, arr: ShadowRoot[] = []) {
  
  doc.querySelectorAll("*").forEach(node => {
    if (node.shadowRoot?.mode === "open") {
      arr.push(node.shadowRoot)
      getShadowRoots(node.shadowRoot, arr)
    }
  })
  return arr 
}

