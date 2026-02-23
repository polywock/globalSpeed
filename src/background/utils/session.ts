declare global {
	interface GlobalVar {
		sess: Session
	}
}

class Session {
	installCbs: Set<() => void> = new Set()
	safeCbs: Set<() => void> = new Set()
	safeStartupCbs: Set<() => void> = new Set()
	#loadedForSession = false
	constructor() {
		chrome.runtime.onInstalled.addListener(this.handleInstall)
		chrome.runtime.onStartup.addListener(this.handleStartup)
	}
	handleInstall = async () => {
		if (this.#loadedForSession) return
		this.#loadedForSession = true
		this.installCbs.forEach((cb) => cb())
		this.handleCommon()
	}
	handleStartup = async () => {
		if (this.#loadedForSession) return
		this.#loadedForSession = true
		this.handleCommon()
	}
	handleCommon = async () => {
		await gvar.installPromise
		this.safeCbs.forEach((cb) => cb())
		this.safeStartupCbs.forEach((cb) => cb())
	}
}

gvar.sess = new Session()

export {}
