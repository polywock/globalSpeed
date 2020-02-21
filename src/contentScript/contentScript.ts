import 'regenerator-runtime/runtime'
import { uuidLowerAlpha } from '../utils/helper'
import { Manager } from './Manager'
import { NETFLIX_URL } from './utils'

declare global {
  interface Window {
    mgr: Manager
  }
}

// performance 
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


if (NETFLIX_URL.test(document.URL)) {
  const injectTag = document.createElement("script")
  injectTag.type = "text/javascript"
  injectTag.text = `
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
  `
  document.body.appendChild(injectTag)
}