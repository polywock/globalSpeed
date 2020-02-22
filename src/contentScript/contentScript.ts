import 'regenerator-runtime/runtime'
import { uuidLowerAlpha } from '../utils/helper'
import { Manager } from './Manager'
import { NETFLIX_URL, injectScript } from './utils'

declare global {
  interface Window {
    mgr: Manager
  }
}

handleVisibilityChange()
document.addEventListener("visibilitychange", handleVisibilityChange)
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

// Chromium orphans contentScripts. Need to listen to a disconnect event for cleanup. 
const port = chrome.runtime.connect({name: "contentScript"})
port.onDisconnect.addListener(() => {
  document.removeEventListener("visibilitychange", handleVisibilityChange)
  window.mgr?.release()
  window.mgr = undefined 
})

// The above should handle it, but a backup to avoid two active content scripts.
let key = uuidLowerAlpha(16)
window.postMessage({type: "NEW_CONTENT_SCRIPT", key}, "*")
window.addEventListener("message", ({data}) => {
  if (data.type === "NEW_CONTENT_SCRIPT" && data.key !== key) {
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
        if (data.type === "SEEK_NETFLIX") {
          try {
            const videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer
            const sessionIds = videoPlayer.getAllPlayerSessionIds()
            for (let sessionId of sessionIds) {
              videoPlayer.getVideoPlayerBySessionId(sessionId).seek(data.position * 1000)
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
      window.postMessage({type: "ATTACHED_SHADOW"}, "*")
    }  
  }
`)

