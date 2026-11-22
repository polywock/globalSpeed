type Player = HTMLElement & { getVideoData?: () => { isLive?: boolean } | undefined }

// YouTube live streams report a finite duration, so the generic live check can't see them.
// The player knows; the isolated world then applies the same buffered-media lock as other sites.
export class YoutubeLive {
	private enabled = false
	private live = false

	constructor(private report: (live: boolean) => void) {}

	update = (enabled: boolean) => {
		if (enabled === this.enabled) return
		this.enabled = enabled
		if (enabled) {
			document.addEventListener("timeupdate", this.check, { capture: true, passive: true })
			document.addEventListener("emptied", this.handleEmptied, { capture: true, passive: true })
		} else {
			document.removeEventListener("timeupdate", this.check, true)
			document.removeEventListener("emptied", this.handleEmptied, true)
			this.set(false)
		}
	}

	// The isolated world drops its flag when a new source loads; report afresh for the next video.
	private handleEmptied = () => {
		this.live = false
	}

	private check = (e: Event) => {
		const player = document.getElementById("movie_player") as Player
		if (!player || e.target !== player.querySelector("video")) return
		let live = false
		try {
			live = player.getVideoData?.()?.isLive === true
		} catch {
			// Unknown player builds must not interfere with normal speed control.
		}
		this.set(live)
	}

	private set = (live: boolean) => {
		if (live === this.live) return
		this.live = live
		this.report(live)
	}
}
