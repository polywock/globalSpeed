import { subscribeView } from "../background/GlobalState"
import { round } from "../utils/helper"

export class SpeedSync {
  released: boolean
  intervalId: number
  client = subscribeView({speed: true}, window.tabInfo.tabId, true, (view) => {
    this.updatePage()
  }, 150, 300)
  constructor() {
    this.intervalId = setInterval(this.updatePage, 1000)
  }
  release = () => {
    if (this.released) return 
    this.client?.release(); delete this.client
    this.released = true 
    this.intervalId = clearInterval(this.intervalId) as null 
  }
  updatePage = () => {
    const speed = this.client?.view?.speed
    if (speed === null) return 
    window.mediaTower.media.forEach(media => {
      if (round(media.playbackRate, 2) !== round(speed, 2)) {
        media.playbackRate = speed 
      }
    })
  }
}


