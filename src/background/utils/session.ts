
declare global {
    interface GlobalVar {
      sess: Session
    }
}


class Session {
    cbs: Set<() => void> = new Set() 
    installCbs: Set<() => void> = new Set() 
    #loadedForSession = false 
    constructor() {
        chrome.runtime.onInstalled.addListener(this.handleInstall)
        chrome.runtime.onStartup.addListener(this.handleStartup)
    }
    handleInstall = () => {
        this.#loadedForSession = true 
        this.installCbs.forEach(cb => cb())
        this.cbs.forEach(cb => cb())
    }
    handleStartup = () => {
        if (this.#loadedForSession) return 
        this.#loadedForSession = true 
        this.cbs.forEach(cb => cb())
    }
}

gvar.sess = new Session()

export {}
