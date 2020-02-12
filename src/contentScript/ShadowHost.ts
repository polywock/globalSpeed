
export class ShadowHost {
  wrapper = document.createElement("div")
  indicator = document.createElement("div")
  backdrop = document.createElement("div")
  timeoutId: number
  constructor() {
  
    // On update, chrome orphans contentScripts (we can listen to disconnect and clean up).
    // Firefox nukes the contentScript, no need to clean up except removing any DOM elements. 
    let existing = document.getElementById("GlobalSpeedShadowHost")
    existing?.parentElement.removeChild(existing)


    this.wrapper.id = "GlobalSpeedShadowHost"
    this.wrapper.setAttribute("style", `
      display: block;
    `)
    
    this.wrapper.attachShadow({mode: "open"})
    this.indicator.setAttribute("style", `
      display: none;
      position: fixed;
      left: 30px;
      top: 30px;
      font-size: 40px;
      font-family: monospace;
      color: white;
      background-color: black;
      z-index: 999999999999;
      padding: 10px;
    `)

    this.backdrop.setAttribute("style", `
      display: none;
      position: fixed;
      left: 0;
      top: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999999999;
      pointer-events: none;
    `)
    this.wrapper.shadowRoot.appendChild(this.indicator)
    this.wrapper.shadowRoot.appendChild(this.backdrop)
  }
  showIndicator(text: string, duration: number, fontSize = "40px") {
    this.indicator.innerText = text
    this.indicator.style.fontSize = fontSize
    this.indicator.style.display = "inline-block"
    this.timeoutId != null && clearTimeout(this.timeoutId)
    this.timeoutId = setTimeout(() => {
      this.indicator.style.display = "none"
    }, duration)
  }
  show(text: string) {
    this.showIndicator(text, 2000, "35px")
  }
  showSmall(text: string) {
    this.showIndicator(text, 2000, "25px")
  }
  showBackdrop(filter: string) {
    if (filter) {
      this.backdrop.style.display = "block";
      (this.backdrop.style as any).backdropFilter = filter 
    } else {
      this.hideBackdrop()
    }
  } 
  hideBackdrop() {
    this.backdrop.style.display = "none"
  } 
}