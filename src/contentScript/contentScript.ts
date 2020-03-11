
import 'regenerator-runtime/runtime'
import { NETFLIX_URL, injectScript } from './utils'
import { uuidLowerAlpha } from '../utils/helper'
import { Manager } from './Manager'
import { ensureGsmLoaded } from '../utils/i18'

declare global {
  interface Window {
    mgr: Manager
  }
}

main()

function main() {
  ensureGsmLoaded().then(() => {
    if (document.readyState === "loading") {
      injectCtx()
      window.addEventListener("DOMContentLoaded", handleDOMLoaded)
    } else {
      handleDOMLoaded()
    }
  })
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
      const mediaReferences = []
    
      const handleMedia = media => {
        if (!mediaReferences.includes(media)) {
          mediaReferences.push(media)
        }
      }
    
      const ogAudioPlay = HTMLAudioElement.prototype.play
      HTMLAudioElement.prototype.play = function(...args) {
        handleMedia(this)
        return ogAudioPlay.apply(this, args)
      }
    
      const ogVideoPlay = HTMLVideoElement.prototype.play
      HTMLVideoElement.prototype.play = function(...args) {
        handleMedia(this)
        return ogVideoPlay.apply(this, args)
      }
    
    
    
      //#region 
      function setPlaybackRate(elem, value) {
        elem.playbackRate = value 
      }
    
      function seekMedia(elem, value, relative) {
        elem.currentTime = relative ? elem.currentTime + value : value 
      }
      
      function setMediaPause(elem, state) {
        if (state === "on" || (state === "toggle" && !elem.paused)) {
          elem.pause()
        } else {
          elem.play()
        }
      }
      
      function setMediaMute(elem, state) {
        elem.muted = state === "on" ? true : state === "off" ? false : !elem.muted
      }
      
      function setMark(elem, key) {
        if (!elem.readyState) return 
      
        elem.marks = elem.marks || {}
        elem.marks[key] = {
          time: elem.currentTime,
          created: new Date().getTime()
        }
      }
      
      function seekMark(elem, key) {
        const mark = elem.marks && elem.marks[key]
        if (mark) {
          elem.currentTime = mark.time
        } else {
          setMark(elem, key)
        }
      }

      function toggleLoop(elem, key) {
        const mark = elem.marks && elem.marks[key]
      
        const handleRemove = () => {
          elem.removeEventListener("timeupdate", elem.gsLoopTimeUpdateHandler)
          elem.removeEventListener("seeking", elem.gsLoopSeekingHandler)
          delete elem.gsLoopTimeUpdateHandler
          delete elem.gsLoopSeekingHandler
        }
      
        if (elem.gsLoopTimeUpdateHandler) {
          handleRemove()
          return 
        }
      
        if (!mark) {
          return 
        } 
      
        const endTime = elem.currentTime
      
        elem.gsLoopTimeUpdateHandler = () => {
          if (elem.currentTime > endTime) {
            elem.currentTime = mark.time
          }
        }
      
        elem.gsLoopSeekingHandler = () => {
          if (elem.currentTime < mark.time || elem.currentTime > endTime) {
            handleRemove()
          }
        }
      
        elem.addEventListener("timeupdate", elem.gsLoopTimeUpdateHandler)
        elem.addEventListener("seeking", elem.gsLoopSeekingHandler)
      }
      
      
      //#endregion 
    
    
      window.addEventListener("message", ({data}) => {
        if (!data) return
        const elems = mediaReferences.filter(v => v.readyState && !v.isConnected)
        
        if (data.type === "GS_SET_MARK") {
          elems.forEach(elem => setMark(elem, data.key))
        } else if (data.type === "GS_SEEK_MARK") {
          elems.forEach(elem => seekMark(elem, data.key))
        } else if (data.type === "GS_SEEK") {
          elems.forEach(elem => seekMedia(elem, data.value, data.relative))
        } else if (data.type === "GS_SET_MUTE") {
          elems.forEach(elem => setMediaMute(elem, data.state))
        } else if (data.type === "GS_SET_PAUSE") {
          elems.forEach(elem => setMediaPause(elem, data.state))
        } else if (data.type === "GS_SET_PLAYBACK_RATE") {
          elems.forEach(elem => {
            setPlaybackRate(elem, data.value)
          })
        } else if (data.type === "GS_TOGGLE_LOOP") {
          elems.forEach(elem => {
            toggleLoop(elem, data.key)
          })
        }
      })
    }
  `)
}