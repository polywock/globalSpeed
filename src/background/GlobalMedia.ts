import { MediaScope, flattenMediaInfos, FlatMediaInfo } from "../contentScript/utils/genMediaInfo";
import { compareFrame, MessageCallback, senderToTabInfo, TabInfo } from "../utils/browserUtils";
import { MediaPath } from "../types";
import { playAudio } from "src/utils/configUtils";

export class GlobalMedia {
  scopes: MediaScope[] = []
  watchPorts: Set<chrome.runtime.Port> = new Set()
  canopyPorts: Set<chrome.runtime.Port> = new Set()
  latestPin: MediaPath
  pushVolume: number 
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
      this.pushVolume && playAudio("good", this.pushVolume)
      const scope = msg.value as MediaScope
      scope.tabInfo = senderToTabInfo(sender)
      if (!scope.tabInfo) return reply(true) 
      scope.pushTime = new Date().getTime()
      const idx = this.scopes.findIndex(v => compareFrame(v.tabInfo, scope.tabInfo))
      if (idx === -1) {
        this.scopes.push(scope)
      } else {
        this.scopes.splice(idx, 1, scope)
      }
      this.sendUpdate()
      reply(true)
    } else if (msg.type === "MEDIA_PUSH_SOUND") {
      this.pushVolume = isNaN(msg.volume) ? 0.5 : msg.volume
    }
  }
  sendUpdate = () => {
    if (this.watchPorts.size) {
      const msg = {scopes: this.scopes, pinned: this.latestPin?.key}
      this.watchPorts.forEach(port => {
        port.postMessage(msg)
      })
    }
  }
  getAuto = (tabInfo: TabInfo, videoOnly?: boolean) => {
    let infos = flattenMediaInfos(this.scopes).filter(info => info.readyState)
    infos = videoOnly ? infos.filter(info => info.videoSize) : infos 
    
    const pinnedInfo = infos.find(info => info.key === this.latestPin?.key)
    if (pinnedInfo) return pinnedInfo

    infos.sort((a, b) => b.pushTime - a.pushTime)
    const pippedInfo = infos.find(info => info.pipMode)
    if (pippedInfo) return pippedInfo

    if (!tabInfo) return 
    infos = infos.filter(info => info.tabInfo.tabId === tabInfo.tabId)

    if (!infos.length) return


    let peakIntersect = infos.filter(v => v.intersectionRatio != null).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]?.intersectionRatio
    console.log(infos)

    let highest: {info: FlatMediaInfo, score: number}
    infos.forEach(info => {
      let score = 0

      const sameFrame = compareFrame(info.tabInfo, tabInfo)
      if (sameFrame && tabInfo.frameId !== 0) {
        score += 0b100000
      }
      if (info.intersectionRatio > 0.05 && info.intersectionRatio === peakIntersect) {
        score += 0b10000
      }
      if (info.infinity || info.duration >= 30 * 60) {
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
      if (info.isVideo && location.hostname !== "www.spotify.com" && !info.isConnected) {
        score = -0b1
      }

      if (!highest || score > highest.score || (score === highest.score && (info.infinity ? 60 : info.duration) > highest.info.duration)) {
        highest = {info, score}
      }
    })

    return highest?.info
  }
}

