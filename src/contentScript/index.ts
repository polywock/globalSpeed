
import { injectCtx, WindowKeyListener } from './utils'
import { TabInfo, requestTabInfo } from '../utils/browserUtils'
import { MediaTower } from './MediaTower'
import { ConfigSync } from './ConfigSync'
import { isFirefox } from '../utils/helper'
import { fetchView } from '../background/GlobalState'
import { Overlay } from './Overlay'
import { SmartFs } from './utils/SmartFs'
import { NativeFs } from './utils/NativeFs'

declare global {
  interface GlobalVar {
    tabInfo: TabInfo,
    mediaTower: MediaTower,
    visibleSync: VisibleSync,
    configSync: ConfigSync,
    fallbackId: number,
    ghostMode: boolean,
    overlay: Overlay,
    keyListener: WindowKeyListener,
    smartFs: SmartFs,
    nativeFs: NativeFs
  }
}

async function main() {
  ;(document as any).gvar = gvar 
  gvar.mediaTower = new MediaTower()
  gvar.smartFs = new SmartFs()
  gvar.nativeFs = new NativeFs()
  gvar.keyListener = new WindowKeyListener()

  if (!(window.frameElement?.id === "ajaxframe")) {
    injectCtx()
    isFirefox() && injectCtx(true)
  }

  await Promise.all([
    requestTabInfo().then(tabInfo => {
      gvar.tabInfo = tabInfo
    }, err => {})
  ])

  // if failed to get, try again after a few seconds. (firefox sometimes)
  if (!gvar.tabInfo) {

    await new Promise((res, rej) => setTimeout(() => res(true), 3000))

    try {
      await Promise.all([
        requestTabInfo().then(tabInfo => {
          gvar.tabInfo = tabInfo
        })
      ])
    } catch (err) {

      // exit 
      return 
    }
  }

  const view = (await fetchView({staticOverlay: true, indicatorInit: true})) || {}
  gvar.overlay = gvar.overlay || new Overlay(view.staticOverlay)
  gvar.overlay.setInit(view.indicatorInit || {})

  if (document.readyState === "loading")  {
    document.addEventListener("DOMContentLoaded", handleDOMLoaded, {capture: true, passive: true, once: true})
  } else {
    handleDOMLoaded()
  }
}

function handleDOMLoaded() {
  gvar.visibleSync = new VisibleSync()

  // Chromium orphans contentScripts. Need to listen to a disconnect event for cleanup. 
  const port = chrome.runtime.connect({name: `canopy`})
  port.onDisconnect.addListener(() => {
    gvar.visibleSync?.release(); delete gvar.visibleSync
    gvar.configSync?.release(); delete gvar.configSync
    gvar.overlay?.release(); delete gvar.overlay
    gvar.keyListener?.release(); delete gvar.keyListener
  })
}



class VisibleSync {
  timeoutId: number
  constructor() {
    window.addEventListener("visibilitychange", this.handleChange, {capture: true, passive: true}) 
    this.sync()
  }
  release = () => {
    window.removeEventListener("visibilitychange", this.handleChange, true) 
  }
  handleChange = () => {
    if (this.timeoutId) {
      this.timeoutId = clearTimeout(this.timeoutId) as null
    }
    // At least for OSX, event gets triggered ephemerally when entering and leaving fullscreen mode. 
    // delay syncing to avoid unneeded release. 
    if (document.hidden) {
      this.timeoutId = setTimeout(this.sync, 1500)
    } else {
      this.sync()
    }
  }
  sync = () => {
    if (document.hidden) {
      gvar.configSync?.release(); 
      delete gvar.configSync
    } else {
      gvar.configSync = gvar.configSync ?? new ConfigSync() 
    }
  }
}

main()