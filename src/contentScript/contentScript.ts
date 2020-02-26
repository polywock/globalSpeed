
import 'regenerator-runtime/runtime'
import { NETFLIX_URL, injectScript } from './utils'
import { uuidLowerAlpha } from '../utils/helper'
import { Manager } from './Manager'

declare global {
  interface Window {
    mgr: Manager
  }
}

main()

function main() {
  if (document.readyState === "loading") {
    injectCtx()
    window.addEventListener("DOMContentLoaded", handleDOMLoaded)
  } else {
    handleDOMLoaded()
  }
}

function handleDOMLoaded(e?: Event) {
  document.addEventListener("visibilitychange", handleVisibilityChange)
  handleVisibilityChange()

  // Chromium orphans contentScripts. Need to listen to a disconnect event for cleanup. 
  const port = chrome.runtime.connect({name: "contentScript"})
  port.onDisconnect.addListener(() => {
    handleRelease()
  })

  // The above should handle it, but a backup to avoid two active content scripts.
  let key = uuidLowerAlpha(16)
  window.postMessage({type: "GS_NEW_CONTENT_SCRIPT", key}, "*")
  window.addEventListener("message", ({data}) => {
    if (data.type === "GS_NEW_CONTENT_SCRIPT" && data.key !== key) {
      handleRelease()
    }
  })
  
  // For seeking Netflix.
  if (e && NETFLIX_URL.test(document.URL)) {
    injectNetflix()
  }

  // For reacting to Shadow DOM changes. 
  e && injectShadow()
}

function handleRelease() {
  document.removeEventListener("visibilitychange", handleVisibilityChange)
  window.mgr?.release()
  window.mgr = undefined 
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") {
    if (!window.mgr) {
      window.mgr = new Manager() 
    }
  } else {
    if (window.mgr) {
      window.mgr.release()
      window.mgr = undefined
    }
  }
}

function injectNetflix() {
  injectScript(`
      if (!window.globalSpeedAddedNetflix) {
        window.globalSpeedAddedNetflix = true 
      
        window.addEventListener("message", ({data}) => {
          if (!data) return
          if (data.type === "GS_SEEK_NETFLIX") {
            try {
              const videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer
              const sessionIds = videoPlayer.getAllPlayerSessionIds()
              for (let sessionId of sessionIds) {
                videoPlayer.getVideoPlayerBySessionId(sessionId).seek(data.value * 1000)
              }
            } catch (err) {}
          }
        })
      }
    `)
}

function injectShadow() {
  injectScript(`
    if (!window.globalSpeedAddedShadow) {
      window.globalSpeedAddedShadow = true 
    
      const ogCreateShadowRoot = Element.prototype.createShadowRoot
      if (ogCreateShadowRoot) {
        Element.prototype.createShadowRoot = function(...args) {
          sendMessage()
          return ogCreateShadowRoot.apply(this, args) 
        }
      }
    
      const ogAttachShadow = Element.prototype.attachShadow
      if (ogAttachShadow) {
        Element.prototype.attachShadow = function(...args) {
          sendMessage()
          return ogAttachShadow.apply(this, args) 
        }
      }
    
      function sendMessage() {
        window.postMessage({type: "GS_ATTACHED_SHADOW"}, "*")
      }  
    }
  `)
}

function injectCtx() {
  injectScript(`
    if (!window.globalSpeedAddedCtx) {
      window.globalSpeedAddedCtx = true 
    
      const ogAudioPlay = HTMLAudioElement.prototype.play
      HTMLAudioElement.prototype.play = function(...args) {
        if (!this.isConnected) {
          this.hidden = true 
          document.documentElement.appendChild(this)
        }
        return ogAudioPlay.apply(this, args)
      }
    
      const ogVideoPlay = HTMLVideoElement.prototype.play
      HTMLVideoElement.prototype.play = function(...args) {
        if (!this.isConnected) {
          this.hidden = true 
          document.documentElement.appendChild(this)
        }
        return ogVideoPlay.apply(this, args)
      }
    }
  `)
}