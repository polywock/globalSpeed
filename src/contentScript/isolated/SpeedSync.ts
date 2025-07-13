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
    document.addEventListener('mouseleave', this.handlePointerLeave, {capture: true, passive: true})
  }
  release = () => {
    clearInterval(this.intervalId); delete this.intervalId
    window.removeEventListener('pointerdown', this.handlePointerDown, true)
    window.removeEventListener('pointerup', this.handlePointerUp, true)
    document.removeEventListener('mouseleave', this.handlePointerLeave, true)
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
    if (this.holdToSpeed !== 0 && e.button === 0) {

      // If directly on video. 
      if ((e.target as HTMLVideoElement).tagName === 'VIDEO') {
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
    setTimeout(this.realize, 110)
  }
  handlePointerUp = (e: PointerEvent) => {
    if (e.button === 0) delete this.pointerDownAt
  }
  handlePointerLeave = () => delete this.pointerDownAt
  realize = () => {
    const hasPointerDown = this.holdToSpeed !== 0 && this.pointerDownAt && between(100, 30_000, Date.now() - this.pointerDownAt)
    this.latest && gvar.os.mediaTower.applySpeedToAll(this.latest.speed * (hasPointerDown ? (this.holdToSpeed ?? 2) : 1), this.latest.freePitch)
  }
}

function checkIfPointerOverVideo(doc: DocumentOrShadowRoot, e: PointerEvent) {
  return doc.elementsFromPoint(e.clientX, e.clientY).some(elem => elem.tagName === 'VIDEO')
}