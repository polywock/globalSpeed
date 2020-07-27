
export class PortCapture {
  ports: chrome.runtime.Port[] = []
  disconnectListeners: Set<(port: chrome.runtime.Port) => void> = new Set()
  constructor() {
    chrome.runtime.onConnect.addListener(async port => {
      this.ports.push(port)
      port.onDisconnect.addListener(this.handleDisconnect)
    })
  }
  handleDisconnect = (port: chrome.runtime.Port) => {
    this.ports = this.ports.filter(p => p !== port)
    this.disconnectListeners.forEach(fn => {
      fn(port)
    })
  }
}

export type PortMessageCallback = (message: any, port: chrome.runtime.Port) => void