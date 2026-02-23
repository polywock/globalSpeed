declare global {
	interface Window {
		netflix?: any
	}
}

function getNetflixVideoPlayers() {
	const videoPlayer = window.netflix.appContext.state.playerApp.getAPI().videoPlayer
	const sessionIds = videoPlayer.getAllPlayerSessionIds()
	let players = sessionIds.map((id: any) => videoPlayer.getVideoPlayerBySessionId(id)).filter((v: any) => v.isReady())
	if (players.length > 1) {
		return players.filter((v: any) => v.isPlaying())
	}
	return players
}

export function seekNetflix(value: number) {
	try {
		getNetflixVideoPlayers().forEach((player: any) => {
			let time = value * 1000
			try {
				let video = player.getElement().querySelector("video")
				let start = video.currentTime - player.getCurrentTime() / 1000
				time = (value - start) * 1000
			} catch {}
			player.seek(time)
		})
	} catch (err) {}
}
