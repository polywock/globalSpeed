
export class Indicator {
  wrapper = document.createElement("div")
  inner = document.createElement("div")
  timeoutId: number
  constructor() {
    this.wrapper.setAttribute("style", `
      display: none;
    `)
    
    this.wrapper.attachShadow({mode: "open"})
    this.inner.setAttribute("style", `
      display: inline-block;
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
    this.wrapper.shadowRoot.appendChild(this.inner)
  }
  showIndicator(text: string, duration: number) {
    this.inner.innerText = text
    this.wrapper.style.display = "block"
    this.timeoutId != null && clearTimeout(this.timeoutId)
    this.timeoutId = setTimeout(() => {
      this.wrapper.style.display = "none"
    }, duration)
  }
}