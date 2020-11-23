import { createOverlayIcons } from "../defaults/icons"
import { INDICATOR_INIT } from "../defaults"
import { IndicatorInit } from "../types"

const BASE_FONT_SIZE = 30 
const BASE_PADDING = 10 
const BASE_BORDER_RADIUS = 10
const SMALL_SCALING = 0.83
const BASE_OFFSET = 30 

export class Overlay {
  wrapper = document.createElement("div")
  shadowRoot = this.wrapper.attachShadow({mode: "closed"})
  indicator = document.createElement("div")
  backdrop = document.createElement("div")
  timeoutId: number
  icons = createOverlayIcons()
  released = false 
  hasIndicator = false
  hasFilter = false 
  root = document.documentElement as Element
  scaling = 1
  duration = 1 
  static = false 
  constructor(fixedOverlay: boolean) {
    this.indicator.setAttribute("style", `
      box-sizing: border-box; 
      position: fixed;
      font-family: Courier, monospace;
      color: white;
      background-color: black;
      z-index: 999999999999;
      white-space: pre;
      display: grid;
      grid-auto-flow: column;
      align-items: center;
      border: none;
    `)

    this.backdrop.setAttribute("style", `
      position: fixed;
      left: 0;
      top: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999999999;
      pointer-events: none;
    `)

    let style = document.createElement("style")
    this.shadowRoot.appendChild(style)
    style.textContent = `
      @keyframes gsScale {
        from {
          transform: scale(0.95);
          opacity: 1;
        }
        to {
          transform: scale(1.05);
          opacity: 0;
        }
      }
    `

    !fixedOverlay && document.addEventListener("fullscreenchange", () => {
      this.handleFullscreenChange()
    }, {capture: true, passive: true})

    this.setInit({})
  }
  setInit = (init: IndicatorInit) => {
    init = init || {}
    this.indicator.style.backgroundColor = init.backgroundColor || INDICATOR_INIT.backgroundColor
    this.indicator.style.color = init.textColor || INDICATOR_INIT.textColor

    this.static = init.static
    this.duration = init.duration ?? 1
    this.scaling = init.scaling ?? INDICATOR_INIT.scaling
    const rounding = (init.rounding ?? INDICATOR_INIT.rounding) * this.scaling

    this.indicator.style.padding = `${BASE_PADDING * (this.scaling + rounding * 0.12)}px`
    this.indicator.style.fontSize = `${BASE_FONT_SIZE * this.scaling}px`
    this.indicator.style.borderRadius = rounding ? `${BASE_BORDER_RADIUS * rounding}px` : "0px"
    this.indicator.style.left = `${BASE_OFFSET * (init.offset ?? 1)}px`
    this.indicator.style.top = `${BASE_OFFSET * (init.offset ?? 1)}px`
  }
  release = () => {
    if (this.released) return 
    this.released = true 
    document.removeEventListener("fullscreenchange", () => {
      this.handleFullscreenChange()
    }, {capture: true})
    this.wrapper?.remove()
    delete this.wrapper
  }
  show = (opts: OverlayShowOpts) => {
    this.timeoutId && clearTimeout(this.timeoutId)
    
    
    this.indicator.innerText = opts.preText || "";
    (opts.icons || []).forEach(v => {
      this.indicator.appendChild(this.icons[v])
    })
    this.indicator.append(opts.text || "")

    const duration = (opts.duration ?? 900) * this.duration
    
    this.indicator.style.fontSize = `${(opts.small ? BASE_FONT_SIZE * SMALL_SCALING : BASE_FONT_SIZE) * this.scaling}px`
    this.indicator.style.animation = (opts.static || this.static) ? "" : `gsScale ${duration}ms ease-out forwards`
    this.indicator.remove()
    this.shadowRoot.appendChild(this.indicator)
  
    this.hasIndicator = true 
    this.syncWrapper()
    
    
    this.timeoutId = setTimeout(() => {
      this.indicator.remove()
      this.hasIndicator = false 
      this.syncWrapper()
      delete this.timeoutId
    }, duration)
  }
  updateBackdrop = (filter?: string) => {
    if (filter) {
      if ((this.backdrop.style as any).backdropFilter !== filter) {
        (this.backdrop.style as any).backdropFilter = filter 
      }
      this.backdrop.isConnected || this.shadowRoot.appendChild(this.backdrop)
      this.hasFilter = true 
      this.syncWrapper()
    } else {
      this.backdrop.remove()
      this.hasFilter = false 
      this.syncWrapper()
    }
  } 
  syncWrapper = () => {
    if (this.hasFilter || this.hasIndicator) {
      this.root = this.root?.isConnected ? this.root : document.documentElement
      if (this.wrapper.parentElement === this.root) return 
      
      try {
        this.root.appendChild(this.wrapper)
      } catch (err) {
        if (this.root !== document.documentElement) {
          this.root = document.documentElement
          document.documentElement.appendChild(this.wrapper)
        } 
      }
    } else {
      this.wrapper?.remove()
    }
  }
  handleFullscreenChange = () => {
    let target = document.documentElement as Element

    let fs = getLeafFullscreenElement(document)
    if (fs && fs.tagName !== "IFRAME") {
      target = fs 
    }
    this.root = target 
    this.syncWrapper()
  }
}

function getLeafFullscreenElement(doc: DocumentOrShadowRoot): Element {
  if (!doc.fullscreenElement) return null
  const fs = doc.fullscreenElement

  let coShadowRoot = fs.shadowRoot
  coShadowRoot && window.mediaTower.processDoc(fs.shadowRoot) // side effect 
  if (!coShadowRoot) {
    coShadowRoot = window.mediaTower.docs.find(doc => doc instanceof ShadowRoot && doc.host === fs) as ShadowRoot
  }

  if (coShadowRoot) {
    let innerFs = getLeafFullscreenElement(coShadowRoot)
    if (innerFs) return innerFs
  } 

  return fs 
}







export type OverlayShowOpts = {
  preText?: string,
  text?: string, 
  duration?: number, 
  small?: boolean, 
  icons?: (keyof ReturnType<typeof createOverlayIcons>)[],
  static?: boolean
}
