export class KeepAlive {
	intervalId: number
	started = Date.now()
	softMax = Date.now() + 60_000 * 10
	hardMax: number
	constructor(minutes: number) {
		this.softMax = this.started + 60_000 * minutes
		this.intervalId = setInterval(this.handleInterval, 20_000)
	}
	release = () => {
		clearInterval(this.intervalId)
	}
	handleInterval = async () => {
		const now = Date.now()
		if (now > this.softMax || now > this.hardMax) {
			this.release()
		}
		await chrome.storage.local.get("g:version")
	}
	static keepAlive?: KeepAlive
	static start(minutes: number) {
		if (KeepAlive.keepAlive) {
			const delta = KeepAlive.keepAlive.softMax - Date.now()
			if (delta > 60_000 * minutes) {
				return
			}
			KeepAlive.keepAlive.release()
			delete KeepAlive.keepAlive
		}
		KeepAlive.keepAlive = new KeepAlive(minutes)
	}
	static clear() {
		KeepAlive.keepAlive?.release()
		delete KeepAlive.keepAlive
	}
}
