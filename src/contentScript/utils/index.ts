import { callNative } from "./nativeCodes"
import { randomId } from "../../utils/helper"

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
    // $$$CTX$$$ is placeholder that is replaced during build. 
    // It's replaced with the build of src/ctx.ts
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


export class WindowTalk {
  ourKey = randomId()
  theirKey: string
  cbs: Set<(msg: any) => void> = new Set()
  initCb?: (key: string) => void 
  constructor(public ourName: string, public theirName: string) {
    callNative("addEventListener", window, ourName, this.handleMessage, {capture: true, passive: true})
  }
  handleMessage = (e: CustomEvent) => {
    callNative("stopImmediatePropagation", e)
    const { detail } = e
    if (!detail) return 
    const payload = JSON.parse(detail)

    if (payload.type === "SET_KEY") {
      if (!this.theirKey) {
        this.theirKey = payload.senderKey
        payload.sendBack && this.sendKey()
        this.initCb?.(this.theirKey)
        delete this.initCb
      }
      return 
    }
    if (payload.senderKey !== this.theirKey) return 
    this.cbs.forEach(fn => fn(payload))
  }
  sendKey = (sendBack?: boolean) => {
    this.send({type: "SET_KEY", senderKey: this.ourKey, sendBack})
  }
  send = (msg: any) => {
    callNative("dispatchEvent", window, new CustomEvent(this.theirName, {detail: JSON.stringify({...msg, senderKey: this.ourKey}), cancelable: false, composed: false, bubbles: false}))
  }
}




