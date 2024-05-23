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
    gvar.os.eListen.fsCbs.add(this.handleFsChange)
  }
  release = () => {
    gvar.os.eListen.fsCbs.delete(this.handleFsChange)
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
      await this.releaseLock()
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
    this.ensureClickListeners()

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
      resetCount++ > 1000 && this.releaseLock()
    }

    if (video.style.pointerEvents !== "initial") {
      video.style.pointerEvents = "initial"
      resetCount++ > 1000 && this.releaseLock()
    }

    if (video.style.background !== "none") {
      video.style.background = "none"
      resetCount++ > 1000 && this.releaseLock()
    }
  }
  ensureClickListeners = () => {
    window.addEventListener("click", this.handleClick, true)
    window.addEventListener("pointerdown", this.handleClick, true)
    window.addEventListener("pointerup", this.handleClick, true)
    window.addEventListener("mouseup", this.handleClick, true)
    window.addEventListener("mousedown", this.handleClick, true)
  }
  removeClickListeners = () => {
    window.removeEventListener("click", this.handleClick, true)
    window.removeEventListener("pointerdown", this.handleClick, true)
    window.removeEventListener("pointerup", this.handleClick, true)
    window.removeEventListener("mouseup", this.handleClick, true)
    window.removeEventListener("mousedown", this.handleClick, true)
  }
  handleClick = (e: MouseEvent) => {
    e.stopImmediatePropagation()
  }
  releaseLock = async () => {
    this.removeClickListeners()
    const lock = this?.lock
    if (!lock) return 
    let { video, originalValues: {scrollX, scrollY}} = this.lock 

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
    if (document.fullscreenElement == null) {
      this.releaseLock(); return  
    }

    const video = this.lock?.video
    if (!video) return 
    if ((video.getRootNode() as Document).fullscreenElement === video) return 
    this.releaseLock()
  }
}