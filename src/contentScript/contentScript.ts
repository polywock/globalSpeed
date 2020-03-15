
import 'regenerator-runtime/runtime'
import { injectScript } from './utils'
import { uuidLowerAlpha } from '../utils/helper'
import { Manager } from './Manager'
import { ensureGsmLoaded } from '../utils/i18'

declare global {
  interface Window {
    mgr: Manager,
    pipMode: boolean
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

async function handleDOMLoaded(e?: Event) {
  await ensureGsmLoaded()

  document.addEventListener("visibilitychange", handleVisibilityChange)
  handleVisibilityChange()

  // Chromium orphans contentScripts. Need to listen to a disconnect event for cleanup. 
  const port = chrome.runtime.connect({name: "contentScript"})
  port.onDisconnect.addListener(() => {
    handleRelease()
  })
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
    if (!window.pipMode && window.mgr) {
      window.mgr.release()
      window.mgr = undefined
    }
  }
}



function injectCtx() {
  injectScript(`
  if (!window.globalSpeedAddedCtx) {
    window.globalSpeedAddedCtx = true 
    const mediaReferences = []
  
    overridePrototypeMethod(HTMLAudioElement, "play", handleMedia)
    overridePrototypeMethod(HTMLAudioElement, "addEventListener", handleMedia)
  
    overridePrototypeMethod(HTMLVideoElement, "play", handleMedia)
    overridePrototypeMethod(HTMLVideoElement, "addEventListener", handleMedia)
  
    overridePrototypeMethod(Element, "createShadowRoot", handleAttachShadow)
    overridePrototypeMethod(Element, "attachShadow", handleAttachShadow)
  
    
    window.addEventListener("message", ({data}) => {
      if (!data) return
      
      if (data.type === "GS_APPLY_MEDIA_EVENT") {
        const elems = mediaReferences.filter(v => v.readyState && !v.isConnected)
        applyMediaEvent(elems, data.value)
      } else if (data.type === "GS_SEEK_NETFLIX") {
        seekNetflix(data.value)
      }
    })
    
  
    function overridePrototypeMethod(type, methodName, eventCb) {
      const ogFunc = type.prototype[methodName]
      type.prototype[methodName] = function(...args) {
        eventCb(this)
        return ogFunc.apply(this, args)
      }
    }
  
    function handleMedia(media) {
      if (!mediaReferences.includes(media)) {
        mediaReferences.push(media)
      }
    }
  
    function handleAttachShadow() {
      window.postMessage({type: "GS_ATTACHED_SHADOW"}, "*")
    } 
  
    //#region NETFLIX UTILS
    function getNetflixVideoPlayers() {
      const videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer
      const sessionIds = videoPlayer.getAllPlayerSessionIds()
      return sessionIds.map(id => (
        videoPlayer.getVideoPlayerBySessionId(id)
      ))
    }
  
    function seekNetflix(value) {
      try {
        getNetflixVideoPlayers().forEach(player => player.seek(value * 1000))
      } catch (err) {
  
      }
    }
    //#endregion
  
    //#region MEDIA UTILS 
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
  
    function applyMediaEvent(elems, e) {
      if (e.type === "SET_PLAYBACK_RATE") {
        elems.forEach(elem => setPlaybackRate(elem, e.value))
      } else if (e.type === "SEEK") {
        elems.forEach(elem => seekMedia(elem, e.value, e.relative))
      } else if (e.type === "PAUSE") {
        elems.forEach(elem => setMediaPause(elem, e.state))
      } else if (e.type === "MUTE") {
        elems.forEach(elem => setMediaMute(elem, e.state))
      } else if (e.type === "SET_MARK") {
        elems.forEach(elem => setMark(elem, e.key))
      } else if (e.type === "SEEK_MARK") {
        elems.forEach(elem => seekMark(elem, e.key))
      } else if (e.type === "TOGGLE_LOOP") {
        elems.forEach(elem => toggleLoop(elem, e.key))
      }
    }
    
    //#endregion 
  }
  `)
}