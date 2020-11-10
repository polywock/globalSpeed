import { subscribeView } from "../background/GlobalState"

export class SpeedSync {
  released: boolean
  intervalId: number
  latest: {freePitch: boolean, speed: number}
  client = subscribeView({speed: true, freePitch: true}, window.tabInfo.tabId, true, view => {
    this.latest = {speed: view.speed, freePitch: view.freePitch} 
    this.updatePage()
  }, 150, 300)
  constructor() {
    this.intervalId = setInterval(this.updatePage, 1000)
    window.mediaTower.newMediaCallbacks.add(this.updatePage)
  }
  release = () => {
    if (this.released) return 
    this.client?.release(); delete this.client
    this.released = true 
    this.intervalId = clearInterval(this.intervalId) as null 
    window.mediaTower.newMediaCallbacks.delete(this.updatePage)
  }
  updatePage = () => {
    this.latest && window.mediaTower.applySpeedToAll(this.latest.speed, this.latest.freePitch)
  }
}



