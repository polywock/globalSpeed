
export class VisibleSync {
    timeoutId: number
    constructor(private cb?: (...args: any[]) => void) {
      gvar.os.eListen.visibilityCbs.add(this.handleChange)
      this.sync()
    }
    release = () => {
      gvar.os.eListen.visibilityCbs.delete(this.handleChange)
    }
    handleChange = () => {
      if (this.timeoutId) {
        this.timeoutId = clearTimeout(this.timeoutId) as null
      }
      
      if (document.hidden) {
        this.timeoutId = setTimeout(this.sync, 1500)
      } else {
        this.sync()
      }
    }
    sync = () => {
      this.cb?.()
    }
}