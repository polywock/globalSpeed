

// FOR SEEKING NETFLIX 
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

// FOR REACTING TO SHADOW DOCUMENTS 
if (!window.globalSpeedAddedShadow) {
  window.globalSpeedAddedShadow = true 

  const ogCreateShadowRoot = Element.prototype.createShadowRoot

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
