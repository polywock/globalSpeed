
import { NETFLIX_URL, injectScript } from './utils'
import 'regenerator-runtime/runtime'
import { uuidLowerAlpha } from '../utils/helper'
import { Manager } from './Manager'

declare global {
  interface Window {
    mgr: Manager
  }
}

function main() {
  injectScript(`
    if (!window.globalSpeedAddedCtx) {
      window.globalSpeedAddedCtx = true 
    
      const ogPlay = HTMLAudioElement.prototype.play
      HTMLAudioElement.prototype.play = function(...args) {
        if (!this.isConnected) {
          this.hidden = true 
          document.documentElement.appendChild(this)
        }
        const output = ogPlay.apply(this, args)
        return output 
      }
    }
  `)

  window.addEventListener("DOMContentLoaded", handleLoad)
}


main()

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

function handleLoad() {
  handleVisibilityChange()
  document.addEventListener("visibilitychange", handleVisibilityChange)

  // Chromium orphans contentScripts. Need to listen to a disconnect event for cleanup. 
  const port = chrome.runtime.connect({name: "contentScript"})
  port.onDisconnect.addListener(() => {
    document.removeEventListener("visibilitychange", handleVisibilityChange)
    window.mgr?.release()
    window.mgr = undefined 
  })

  // The above should handle it, but a backup to avoid two active content scripts.
  let key = uuidLowerAlpha(16)
  window.postMessage({type: "GS_NEW_CONTENT_SCRIPT", key}, "*")
  window.addEventListener("message", ({data}) => {
    if (data.type === "GS_NEW_CONTENT_SCRIPT" && data.key !== key) {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.mgr?.release()      
      window.mgr = undefined
    }
  })



  // For seeking Netflix.
  if (NETFLIX_URL.test(document.URL)) {
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

  // For reacting to Shadow DOM changes. 
  injectScript(`
    if (!window.globalSpeedAddedShadow) {
      window.globalSpeedAddedShadow = true 
    
      const ogCreateShadowRoot = Element.prototype.createShadowRoot
      if (ogCreateShadowRoot) {
        Element.prototype.createShadowRoot = function(...args) {
          sendMessage()
          ogCreateShadowRoot.apply(this, args) 
        }
      }
    
      const ogAttachShadow = Element.prototype.attachShadow
      if (ogAttachShadow) {
        Element.prototype.attachShadow = function(...args) {
          sendMessage()
          ogAttachShadow.apply(this, args) 
        }
      }
    
      function sendMessage() {
        window.postMessage({type: "GS_ATTACHED_SHADOW"}, "*")
      }  
    }
  `)
}

