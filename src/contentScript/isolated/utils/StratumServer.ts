
export class StratumServer {
    parasite: HTMLDivElement
    parasiteRoot: ShadowRoot
    wiggleCbs = new Set<(target: Node & ParentNode) => void>()
    msgCbs = new Set<(data: any) => void>()
    initCbs = new Set<() => void>()
    #serverName: string 
    #clientName: string 
    initialized = false 
  
    constructor() {
      window.addEventListener("GS_INIT", this.handleInit, {capture: true, once: true})
    }
    handleInit = (e: CustomEvent) => {
      if (!(e.target instanceof HTMLDivElement && e.target.id === "GS_PARASITE" && e.target.shadowRoot)) return 
      this.parasite = e.target
      this.parasiteRoot = e.target.shadowRoot
      this.#serverName = `GS_SERVER_${e.detail}`
      this.#clientName = `GS_CLIENT_${e.detail}`
  
      this.parasiteRoot.addEventListener(this.#serverName, this.handle, {capture: true})
      
      this.initCbs.forEach(cb => cb())
      this.initCbs.clear()
      this.initialized = true 
    }
    handle = (e: CustomEvent) => {
      e.stopImmediatePropagation()
      let detail: any
      try {
        detail = JSON.parse(e.detail)
      } catch (err) {}
  
  
      if (detail.type === "WIGGLE") {
        const parent = this.parasite.parentNode
        if (parent) {
          this.parasite.remove()
          this.wiggleCbs.forEach(cb => cb(parent))
        }
      } else if (detail.type === "MSG") {
        this.msgCbs.forEach(cb => cb(detail.data || {}))
      }
    }
    send = (data: any) => {
      this.parasiteRoot.dispatchEvent(new CustomEvent(this.#clientName, {detail: JSON.stringify(data)}))
    }
  }