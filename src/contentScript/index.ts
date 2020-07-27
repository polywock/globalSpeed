
import { injectCtx, injectScript } from './utils'
import { TabInfo, requestTabInfo } from '../utils/browserUtils'
import { MediaTower } from './MediaTower'
import { ConfigSync } from './ConfigSync'
import { requestGsm } from '../utils/configUtils'
import { isFirefox } from '../utils/helper'
import { fetchView } from '../background/GlobalState'
import { Overlay } from './Overlay'

declare global {
  interface Window {
    isContentScript: boolean,
    tabInfo: TabInfo,
    mediaTower: MediaTower,
    visibleSync: VisibleSync,
    configSync: ConfigSync,
    fallbackId: number,
    ghostMode: boolean,
    overlay: Overlay
  }
}


async function main() {
  window.isContentScript = true
  window.mediaTower = new MediaTower()

  if (!(window.frameElement?.id === "ajaxframe")) {
    injectCtx()
    isFirefox() && injectCtx(true)
  }


  fetchView({ghostMode: true}).then(view => {
    window.ghostMode = view.ghostMode
    if (!window.ghostMode) return 

    let repeatCount = 0
    const intervalId = setInterval(() => {
      repeatCount++ 
      if (repeatCount > 20) clearInterval(intervalId)
      if (window.mediaTower.talk.theirKey) {
        window.mediaTower.talk.send({type: "ACTIVATE_GHOST"})
        clearInterval(intervalId)
      }
    }, 500)
  })

  await Promise.all([
    requestTabInfo().then(tabInfo => {
      window.tabInfo = tabInfo
    }),
    requestGsm().then(gsm => {
      window.gsm = gsm 
    })
  ])

  if (document.readyState === "loading")  {
    document.addEventListener("DOMContentLoaded", handleDOMLoaded, {capture: true, passive: true, once: true})
  } else {
    handleDOMLoaded()
  }
}

function handleDOMLoaded() {
  window.visibleSync = new VisibleSync()

  // Chromium orphans contentScripts. Need to listen to a disconnect event for cleanup. 
  const port = chrome.runtime.connect({name: `canopy`})
  port.onDisconnect.addListener(() => {
    window.visibleSync?.release(); delete window.visibleSync
    window.configSync?.release(); delete window.configSync
    window.overlay?.release(); delete window.overlay
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
      window.configSync?.release(); 
      delete window.configSync
    } else {
      window.configSync = window.configSync ?? new ConfigSync() 
    }
  }
}


main()
