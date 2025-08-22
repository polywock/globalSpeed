import { between } from "src/utils/helper"
import { SubscribeView } from "src/utils/state"

export class SpeedSync {
  intervalId: number
  latest: {freePitch: boolean, speed: number}
  holdToSpeed: number  
  speedClient?: SubscribeView
  pointerDownAt: number
  constructor() {
    window.addEventListener('pointerdown', this.handlePointerDown, {capture: true, passive: true})
    window.addEventListener('pointerup', this.handlePointerUp, {capture: true, passive: true})
    document.addEventListener('mouseleave', this.clearPointerDown, {capture: true, passive: true})
  }
  release = () => {
    clearInterval(this.intervalId); delete this.intervalId
    window.removeEventListener('pointerdown', this.handlePointerDown, true)
    window.removeEventListener('pointerup', this.handlePointerUp, true)
    document.removeEventListener('mouseleave', this.clearPointerDown, true)
  }
  update = () => {
    if (this.latest) {
      this.intervalId = this.intervalId ?? setInterval(this.realize, 1000)
      gvar.os.mediaTower.forceSpeedCallbacks.add(this.realize)
      this.realize()
    } else {
      this.intervalId = (clearInterval(this.intervalId), null)
    }
  }
  handlePointerDown = (e: PointerEvent) => {
    if (this.holdToSpeed && e.button === 0) {

      // If directly on video. 
      if ((e.target as HTMLVideoElement)?.tagName === 'VIDEO') {
        this.setPointerDownToNow()
        return 
      }

      // If over a video. 
      if (checkIfPointerOverVideo(document, e) ) {
        this.setPointerDownToNow()
        return 
      }

      // More thoroughly check if over a video.
      const shadowRoots = new Set([...gvar.os.mediaTower.media].filter(v => !v.paused && v.tagName === 'VIDEO' && v.gsShadowRoot).map(v => v.gsShadowRoot))
      if (shadowRoots.size && [...shadowRoots].some(root => checkIfPointerOverVideo(root, e))) {
        this.setPointerDownToNow()
      }
    }
  }
  setPointerDownToNow = () => {
    this.pointerDownAt = Date.now() 
    setTimeout(this.realize, 620)
  }
  handlePointerUp = (e: PointerEvent) => {
    if (e.button === 0) this.clearPointerDown()
  }
  clearPointerDown = () => {
    if (this.pointerDownAt) {
      delete this.pointerDownAt
      this.realize()
    }
  }
  realize = () => {
    const hasPointerDown = this.holdToSpeed && this.pointerDownAt && between(600, 30_000, Date.now() - this.pointerDownAt)
    this.latest && gvar.os.mediaTower.applySpeedToAll(this.latest.speed * (hasPointerDown ? this.holdToSpeed : 1), this.latest.freePitch)
  }
}

const PROHIBITED_TYPES = new Set(['INPUT', 'BUTTON', 'TEXTAREA'])
function checkIfPointerOverVideo(doc: DocumentOrShadowRoot, e: PointerEvent) {
  const elems = doc.elementsFromPoint(e.clientX, e.clientY)
  return elems.some(elem => elem.tagName === 'VIDEO') && elems.every(elem => !PROHIBITED_TYPES.has(elem.tagName))
}