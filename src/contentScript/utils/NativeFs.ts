import { IS_NATIVE } from "./isWebsite"

export class NativeFs {
  lock?: {
    video: HTMLMediaElement,
    mo: MutationObserver,
    originalValues: {controls: boolean, pointerEvents: string, background: string, scrollX: number, scrollY: number},
    modifiedSheets: {sheet: StyleSheet, original: boolean}[],
    resetCount: number 
  }
  operationLock: boolean
  constructor() {
    window.addEventListener("fullscreenchange", this.handleFsChange, {capture: true, passive: true})
    window.addEventListener("webkitfullscreenchange", this.handleFsChange, {capture: true, passive: true})
  }
  toggleSafe = async (video: HTMLVideoElement) => {
    if (this.operationLock) return 
    
    this.operationLock = true 
    await this.toggle(video).finally(() => {
      delete this.operationLock
    })
  }
  toggle = async (video: HTMLVideoElement) => {
    if (this.lock) {
      await this.release()
      return 
    }
    
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return 
    }
    
    if (video?.isConnected && IS_NATIVE) {
      await this.activate(video)
    }
  }
  async activate(video: HTMLVideoElement) {
    await video.requestFullscreen()

    this.lock = {
      video,
      originalValues: {
        controls: video.controls, 
        pointerEvents: video.style.pointerEvents,
        background: video.style.background,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      },
      mo: new MutationObserver(this.ensureProper),
      modifiedSheets: [],
      resetCount: 0
    }

    let { mo, modifiedSheets  } = this.lock 

    mo.observe(video, {attributeFilter: ["controls", "style"]});
    
    [...document.styleSheets].forEach(sheet => {
      try {
        const original = sheet.disabled
        sheet.disabled = true 
        modifiedSheets.push({sheet, original})
      } catch (err) { }
    }) 

    this.ensureProper()
  }
  ensureProper = () => {
    if (!this.lock) return 
    let { video, resetCount } = this.lock
    if (!video) return 
    
    if (!video.controls) {
      video.controls = true   
      resetCount++ > 1000 && this.release()
    }

    if (video.style.pointerEvents !== "initial") {
      video.style.pointerEvents = "initial"
      resetCount++ > 1000 && this.release()
    }

    if (video.style.background !== "none") {
      video.style.background = "none"
      resetCount++ > 1000 && this.release()
    }
  }
  release = async () => {
    let { lock, lock: { video, originalValues: {scrollX, scrollY}} } = this 
    if (!lock) return 

    lock.mo?.disconnect(); delete lock.mo
    lock.modifiedSheets.forEach(({sheet, original}) => {
      sheet.disabled = original 
    })
    video.controls = lock.originalValues.controls
    video.style.pointerEvents = lock.originalValues.pointerEvents
    video.style.background = lock.originalValues.background
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    }
    window.scrollTo(scrollX, scrollY)
    delete this.lock
  }
  handleFsChange = () => {    
    const video = this.lock?.video
    if (!video) return 
    if ((video.getRootNode() as Document).fullscreenElement === video) return 
    this.release()
  }
}