
declare global {
  interface Window {
    netflix?: any
  }
}

function getNetflixVideoPlayers() {
  const videoPlayer = window.netflix.appContext.state.playerApp.getAPI().videoPlayer
  const sessionIds = videoPlayer.getAllPlayerSessionIds()
  return sessionIds.map((id: any) => (
    videoPlayer.getVideoPlayerBySessionId(id)
  ))
}

export function seekNetflix(value: number) {
  try {
    getNetflixVideoPlayers().forEach((player: any) => player.seek(value * 1000))
  } catch (err) {

  }
}