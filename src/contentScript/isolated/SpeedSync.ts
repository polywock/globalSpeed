import { SubscribeView } from "src/utils/state"

export class SpeedSync {
  intervalId: number
  latest: {freePitch: boolean, speed: number}
  speedClient?: SubscribeView
  constructor() {

  }
  release = () => {
    clearInterval(this.intervalId)
  }
  update = () => {
    if (this.latest) {
      this.intervalId = this.intervalId ?? setInterval(this.realize, 1000)
      gvar.os.mediaTower.newMediaCallbacks.add(this.realize)
      this.realize()
    } else {
      this.intervalId = (clearInterval(this.intervalId), null)
      gvar.os.mediaTower.newMediaCallbacks.delete(this.realize)
    }
  }
  realize = () => {
    this.latest && gvar.os.mediaTower.applySpeedToAll(this.latest.speed, this.latest.freePitch)
  }
}