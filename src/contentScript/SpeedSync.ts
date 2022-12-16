import { subscribeView } from "../background/GlobalState"

export class SpeedSync {
  released: boolean
  intervalId: number
  static applySpeedOnHiddenDoc = true  
  static latest: {freePitch: boolean, speed: number}
  client = subscribeView({speed: true, freePitch: true}, gvar.tabInfo.tabId, true, view => {
    SpeedSync.latest = {speed: view.speed, freePitch: view.freePitch} 
    this.updatePage()
  }, 150, 300)
  constructor() {
    this.intervalId = setInterval(this.updatePage, 1000)
    gvar.mediaTower.newMediaCallbacks.add(this.updatePage)
  }
  release = () => {
    if (this.released) return 
    this.client?.release(); delete this.client
    this.released = true 
    this.intervalId = clearInterval(this.intervalId) as null 
    gvar.mediaTower.newMediaCallbacks.delete(this.updatePage)
  }
  updatePage = () => {
    SpeedSync.latest && gvar.mediaTower.applySpeedToAll(SpeedSync.latest.speed, SpeedSync.latest.freePitch)
  }
  static handleHiddenDocSpeedPrompt = () => {
    SpeedSync.latest && SpeedSync.applySpeedOnHiddenDoc && gvar.mediaTower.applySpeedToAll(SpeedSync.latest.speed, SpeedSync.latest.freePitch)
  }
}



