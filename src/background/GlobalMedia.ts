import { MediaScope, flattenMediaInfos, FlatMediaInfo } from "../contentScript/utils/genMediaInfo";
import { compareFrame, MessageCallback, senderToTabInfo, TabInfo } from "../utils/browserUtils";
import { MediaPath } from "../types";

export class GlobalMedia {
  scopes: MediaScope[] = []
  watchPorts: Set<chrome.runtime.Port> = new Set()
  canopyPorts: Set<chrome.runtime.Port> = new Set()
  latestPin: MediaPath
  constructor() {
    chrome.runtime.onMessage.addListener(this.handleMessage)
    chrome.runtime.onConnect.addListener(port => {
      if (port.name === "MEDIA_WATCH") {
        this.watchPorts.add(port)
        this.sendUpdate()
        port.onDisconnect.addListener(() => {
          this.watchPorts.delete(port)
        })

      } else if (port.name === "MEDIA_CANOPY") {
        this.canopyPorts.add(port)
        port.onDisconnect.addListener(() => {
          this.canopyPorts.delete(port)
          this.scopes = this.scopes.filter(scope => !compareFrame(scope.tabInfo, senderToTabInfo(port.sender)))
          this.sendUpdate()
        })
      }
    })
  }
  handleMessage: MessageCallback = (msg, sender, reply) => {
    if (msg.type === "MEDIA_SET_PIN") {
      this.latestPin = msg.value 
      this.sendUpdate()
      reply(true)
    } else if (msg.type === "MEDIA_PUSH_SCOPE") {
      const scope = msg.value as MediaScope
      scope.tabInfo = senderToTabInfo(sender)
      scope.pushTime = new Date().getTime()
      const idx = this.scopes.findIndex(v => compareFrame(v.tabInfo, scope.tabInfo))
      if (idx === -1) {
        this.scopes.push(scope)
      } else {
        this.scopes.splice(idx, 1, scope)
      }
      this.sendUpdate()
      reply(true)
    }
  }
  sendUpdate = () => {
    if (this.watchPorts.size) {
      const msg = {scopes: this.scopes, pinInfo: this.latestPin}
      this.watchPorts.forEach(port => {
        port.postMessage(msg)
      })
    }
  }
  getAuto = (tabInfo: TabInfo) => {
    let infos = flattenMediaInfos(this.scopes, this.latestPin).filter(info => info.readyState)
    
    const pinnedInfo = infos.find(info => info.pinned)
    if (pinnedInfo) return pinnedInfo

    infos.sort((a, b) => b.pushTime - a.pushTime)
    const pippedInfo = infos.find(info => info.pipMode)
    if (pippedInfo) return pippedInfo

    if (!tabInfo) return 
    infos = infos.filter(info => info.tabInfo.tabId === tabInfo.tabId)
      .filter(info => info.domain !== "iview.abc.net.au" || info.isConnected)

    if (!infos.length) return

    let highest: FlatMediaInfo[] = []
    let highestScore = -Infinity

    infos.forEach(info => {
      let score = 0

      const sameFrame = compareFrame(info.tabInfo, tabInfo)
      if (sameFrame && tabInfo.frameId !== 0) {
        score += 0b1000
      }
      if (info.duration >= 10 * 60) {
        score += 0b100
      }
      if (info.duration >= 3 * 60) {
        score += 0b10
      }
      if (info.duration >= 1 * 60) {
        score += 0b1
      }

      if (score >= highestScore) {
        if (score !== highestScore) {
          highestScore = score 
          highest = []
        }
        highest.push(info)
      }
    })

    if (highest.length) {
      return highest.sort((a, b) => b.duration - a.duration)[0]
    }
  }
}

