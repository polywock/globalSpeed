
export function injectScript(text: string) {
  if (!text) return 
  const script = document.createElement("script")
  script.type = "text/javascript"
  script.text = text  
  document.documentElement.appendChild(script)
  script.remove()
}

export function injectCtx(file = false) {
  if (file) {
    const script = document.createElement("script")
    script.type = "text/javascript"
    script.src = chrome.runtime.getURL("ctx.js")
    script.async = true 
    document.documentElement.appendChild(script)
  } else {
    // $CTX$ is placeholder that is replaced during build. 
    // It's replaced with the build of src/contentScript/ctx.ts
    injectScript("$$$CTX$$$")
  }
}



export function documentHasFocus() {
  return document.hasFocus() && !(document.activeElement?.tagName === "IFRAME")
}

export function requestSendMessage(msg: any, tabId: number, frameId: number) {
  if (window.isBackground) {
    chrome.tabs.sendMessage(tabId, msg, msg.frameId == null ? {} : {frameId: msg.frameId})
    chrome.runtime.sendMessage({type: "REQUEST_SEND_MSG", msg, tabId, frameId})
  } else {
    chrome.runtime.sendMessage({type: "REQUEST_SEND_MSG", msg, tabId, frameId})
  }
}


export class WindowKeyListener {
  downCbs: Set<(e: KeyboardEvent) => void> = new Set()
  upCbs: Set<(e: KeyboardEvent) => void> = new Set()
  withinFrame: boolean
  constructor() {
    this.setup();

    if (window.frameElement?.tagName === "IFRAME") {
      this.withinFrame = true;
      (window.frameElement as HTMLIFrameElement).addEventListener("load", this.setup, {capture: true, passive: true})
    }
  }
  setup = () => {
    window.addEventListener("keydown", this.handleKeyDown, true)
    window.addEventListener("keyup", this.handleKeyUp, true)

    // ensure event listeners are added, some events don't register before load.
    if (this.withinFrame) gvar.mediaTower.ensureEventListeners()
  }
  release = () => {
    window.removeEventListener("keydown", this.handleKeyDown, true)
    window.removeEventListener("keyup", this.handleKeyUp, true)
  }
  handleKeyDown = (e: KeyboardEvent) => {
    this.downCbs.forEach(cb => {
      cb(e)
    })
  }
  handleKeyUp = (e: KeyboardEvent) => {
    this.upCbs.forEach(cb => {
      cb(e)
    })
  }
}



function getShadowRoot(v: Element) {
  if (v.shadowRoot) return v.shadowRoot

  for (let doc of gvar.mediaTower.docs) {
    if (doc instanceof ShadowRoot && doc.host === v) {
      return doc 
    }
  }
}

export function findLeafActiveElement(doc: DocumentOrShadowRoot): Element {
  const active = doc?.activeElement
  if (!active) return 

  const shadowRoot = getShadowRoot(active)
  if (shadowRoot && shadowRoot.activeElement) {
    return findLeafActiveElement(shadowRoot)
  }

  return active 
}


