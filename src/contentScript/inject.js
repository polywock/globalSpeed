

// FOR SEEKING NETFLIX 
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

// FOR REACTING TO SHADOW DOCUMENTS 
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