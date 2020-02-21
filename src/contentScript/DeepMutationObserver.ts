
import { PollShadowRoots } from "./PollShadowRoots"

export class DeepMutationObserver {
  mo: MutationObserver
  listeners: Set<(muts: MutationRecord[]) => void> = new Set()
  released = false 
  psr = PollShadowRoots.getCommon()
  constructor() {
    this.mo = new MutationObserver(this.moCallback)
    let docs = [document, ...this.psr.shadowRoots]
    docs.forEach(doc => {
      this.mo.observe(doc, {childList: true, subtree: true})
    })
    this.psr.listeners.add(this.handlePsrChange)
  }
  release() {
    if (this.released) return 
    this.released = true 
    this.psr?.listeners.delete(this.handlePsrChange)
    PollShadowRoots.releaseCommon()
    this.mo.disconnect()
    delete this.listeners
    delete this.mo 
  }
  moCallback = (muts: MutationRecord[]) => {
    this.listeners.forEach(listener => {
      listener(muts)
    })
  }
  handlePsrChange = (added: ShadowRoot[], removed: ShadowRoot[]) => {
    added.forEach(root => {
      this.mo.observe(root, {childList: true, subtree: true})
    })
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


