
import { PollShadowRoots } from "./PollShadowRoots"

export class DeepMutationObserver {
  mo: MutationObserver
  listeners: Set<(muts: MutationRecord[]) => void> = new Set()
  elapsed = 0
  released = false 
  psr = PollShadowRoots.getCommon()
  constructor() {
    this.mo = new MutationObserver(this.moCallback)
    let docs = [document, ...this.psr.shadowRoots]
    const oldTime = new Date().getTime()
    docs.forEach(doc => {
      this.mo.observe(doc, {childList: true, subtree: true})
    })
    this.elapsed += new Date().getTime() - oldTime
    this.psr.listeners.add(this.handleMsrChange)
  }
  release() {
    if (this.released) return 
    this.released = true 
    this.psr?.listeners.delete(this.handleMsrChange)
    PollShadowRoots.releaseCommon()
    this.mo.disconnect()
    delete this.listeners
    delete this.mo 
  }
  moCallback = (muts: MutationRecord[]) => {
    const oldTime = new Date().getTime()
    this.listeners.forEach(listener => {
      listener(muts)
    })
    this.elapsed += new Date().getTime() - oldTime
  }
  handleMsrChange = (added: ShadowRoot[], removed: ShadowRoot[]) => {
    const oldTime = new Date().getTime()
    added.forEach(root => {
      this.mo.observe(root, {childList: true, subtree: true})
    })
    this.elapsed += new Date().getTime() - oldTime
  }
  
  static common: DeepMutationObserver
  static referenceCount = 0
  static getCommon() {
    DeepMutationObserver.referenceCount++
    DeepMutationObserver.common = DeepMutationObserver.common || new DeepMutationObserver()
    return DeepMutationObserver.common
  }
  static releaseCommon() {
    DeepMutationObserver.referenceCount--
    if (DeepMutationObserver.referenceCount <= 0) {
      DeepMutationObserver.common.release()
      delete DeepMutationObserver.common
    }
  }
}


