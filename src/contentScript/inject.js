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
