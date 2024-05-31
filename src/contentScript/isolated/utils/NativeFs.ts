import { insertStyle } from "src/utils/nativeUtils"
import { IS_NATIVE } from "./isWebsite"

export class NativeFs {
  lock?: {
    video: HTMLMediaElement,
    mo: MutationObserver,
    originalValues: {controls: boolean,scrollX: number, scrollY: number},
    style?: HTMLStyleElement,
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
    if (!document.fullscreenElement) return
    this.ensureClickListeners()

    let rootNode = video.getRootNode()

    this.lock = {
      video,
      originalValues: {
        controls: video.controls, 
        scrollX: window.scrollX,
        scrollY: window.scrollY
      },
      mo: new MutationObserver(this.ensureProper),
      style: insertStyle(`:is(*, #proooo > #fesss > #sion > #al) { all: revert !important; pointer-events: all; }`, rootNode instanceof ShadowRoot ? rootNode : document.documentElement),
      resetCount: 0
    }

    this.lock.mo.observe(video, {attributeFilter: ["controls"]});

    this.ensureProper()
  }
  ensureProper = () => {
    if (!this.lock) return 
    let { video, resetCount } = this.lock
    
    if (!video.controls) {
      video.controls = true   
      resetCount++ > 1000 && this.releaseLock()
    }
  }
  ensureClickListeners = () => {
    gvar.os.eListen.clickCbs.add(this.handleClick)
    gvar.os.eListen.pointerDownCbs.add(this.handleClick)
    gvar.os.eListen.pointerUpCbs.add(this.handleClick)
    gvar.os.eListen.mouseDownCbs.add(this.handleClick)
    gvar.os.eListen.mouseUpCbs.add(this.handleClick)
    gvar.os.eListen.touchStartCbs.add(this.handleClick)
  }
  removeClickListeners = () => {
    gvar.os.eListen.clickCbs.delete(this.handleClick)
    gvar.os.eListen.pointerDownCbs.delete(this.handleClick)
    gvar.os.eListen.pointerUpCbs.delete(this.handleClick)
    gvar.os.eListen.mouseDownCbs.delete(this.handleClick)
    gvar.os.eListen.mouseUpCbs.delete(this.handleClick)
    gvar.os.eListen.touchStartCbs.delete(this.handleClick)
  }
  handleClick = (e: Event) => {
    e.stopImmediatePropagation()
  }
  releaseLock = async () => {
    this.removeClickListeners()
    const lock = this?.lock
    if (!lock) return 
    let { video, originalValues: {scrollX, scrollY}} = this.lock 

    lock.mo?.disconnect(); delete lock.mo
    lock.style?.remove(); delete lock.style
    video.controls = lock.originalValues.controls
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