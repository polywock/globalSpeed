import { createElement as m } from "src/utils/helper"
import styles from "./styles.css?raw"
import { ScalableDiv } from "./ScalableDiv"
import { FilterEntry, SvgFilter } from "src/types"
import { calculateStyle } from "../isolated/FxSync"
import { formatFilters } from "src/utils/configUtils"

declare global {
  interface GlobalVar {
    Pane?: typeof Pane
  }
}


export class Pane {
  div = document.createElement("div")
  innerDiv = document.createElement("div")
  sDiv = new ScalableDiv(this.div)
  hasBorder = true 
  color: string
  styleInfo: ReturnType<typeof calculateStyle>
  public releaseCb: () => void
  constructor(private filters: FilterEntry[], private svgFilters: SvgFilter[], isClone = false) {
    this.styleInfo = calculateStyle(true, "v", formatFilters(filters || []), "", "center", svgFilters || [])
    if (this.styleInfo.svg) {
      this.div.appendChild(this.styleInfo.svg)
    }

    this.innerDiv.classList.add("inner")
    this.div.appendChild(this.innerDiv)
    this.div.classList.add("pane")
    Pane.addPane(this);
    Pane.shadowRoot?.append(this.div)
    this.div.tabIndex = 0

    this.div.addEventListener("contextmenu", e => {
      e.preventDefault()
      e.stopImmediatePropagation()
      this.release()
    }, {once: true})

    const icons = createPaneIcons()
    const menu = document.createElement("div")
    this.div.appendChild(menu)

    menu.classList.add("menu")

    menu.appendChild(icons.clone)
    menu.appendChild(icons.paintRoller)
    menu.appendChild(icons.borderAll)
    menu.appendChild(icons.times)

    icons.clone.addEventListener("click", e => {
      const newPane = Pane.clone(this)
      newPane.div.focus()
    })

    icons.paintRoller.querySelector("#colorInput").addEventListener("input", e => {
      this.color = (e.target as HTMLInputElement).value 
      this.sync()
    })

    icons.paintRoller.addEventListener("click", e => {
      if (this.color) {
        delete this.color 
        this.sync()
        e.preventDefault()
      } 
    })

    icons.borderAll.addEventListener("click", e => {
      this.hasBorder = !this.hasBorder
      this.sync()
    })

    icons.times.addEventListener("click", e => {
      this.release()
    })

    this.sync()

  }
  release = () => {
    delete this.div
    this.sDiv?.release(); delete this.sDiv
    this.styleInfo?.svg?.remove()
    Pane.deletePane(this)
  }
  sync = () => {
    if (this.hasBorder) {
      this.div.style.border = "1px solid black"
      this.div.classList.add("hasBorder")
    } else {
      this.div.style.border = "none"
      this.div.classList.remove("hasBorder")
    }

    if (this.color) {
      this.innerDiv.style.backgroundColor = this.color;
      (this.innerDiv.style as any).backdropFilter = "none"
    } else {
      (this.innerDiv.style as any).backdropFilter = this.styleInfo.filterValue || ""
      this.innerDiv.style.backgroundColor = "transparent"
    }
  }
  static panes: Set<Pane> = new Set() 
  static shadowRoot: ShadowRoot
  static addPane = (pane: Pane) => {
    Pane.panes.add(pane)
    if (Pane.panes.size && !Pane.shadowRoot) {
      Pane.shadowRoot = document.createElement("div").attachShadow({mode: "closed"})
      const style = document.createElement("style")
      style.textContent = styles
      Pane.shadowRoot.appendChild(style)
      document.body.appendChild(Pane.shadowRoot.host)
    }
  }
  static deletePane = (pane: Pane) => {
    Pane.panes.delete(pane)
    if (Pane.panes.size === 0 && Pane.shadowRoot) {
      Pane.shadowRoot.host.remove() 
      delete Pane.shadowRoot
    }
  }
  static clone = (src: Pane) => {
    const pane = new Pane(src.filters, src.svgFilters, true)
    pane.color = src.color 
    pane.sDiv.x = src.sDiv.x + 20
    pane.sDiv.y = src.sDiv.y + 20
    pane.sDiv.width = src.sDiv.width
    pane.sDiv.height = src.sDiv.height
    pane.sDiv.sync()
    pane.hasBorder = src.hasBorder
    pane.sync()
    return pane 
  }
}

gvar.Pane = Pane 



function createPaneIcons() {
  return {
    clone: m(`<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M464 0c26.51 0 48 21.49 48 48v288c0 26.51-21.49 48-48 48H176c-26.51 0-48-21.49-48-48V48c0-26.51 21.49-48 48-48h288M176 416c-44.112 0-80-35.888-80-80V128H48c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48h288c26.51 0 48-21.49 48-48v-48H176z"></path></svg>`) as SVGElement,
    times: m(`<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 352 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>`) as SVGElement,
    paintRoller: m(`<label for="colorInput">
      <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M416 128V32c0-17.67-14.33-32-32-32H32C14.33 0 0 14.33 0 32v96c0 17.67 14.33 32 32 32h352c17.67 0 32-14.33 32-32zm32-64v128c0 17.67-14.33 32-32 32H256c-35.35 0-64 28.65-64 64v32c-17.67 0-32 14.33-32 32v128c0 17.67 14.33 32 32 32h64c17.67 0 32-14.33 32-32V352c0-17.67-14.33-32-32-32v-32h160c53.02 0 96-42.98 96-96v-64c0-35.35-28.65-64-64-64z"></path></svg>
      <input type="color" id="colorInput">
    </label>`) as HTMLLabelElement,
    borderAll: m(`<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M416 32H32A32 32 0 0 0 0 64v384a32 32 0 0 0 32 32h384a32 32 0 0 0 32-32V64a32 32 0 0 0-32-32zm-32 64v128H256V96zm-192 0v128H64V96zM64 416V288h128v128zm192 0V288h128v128z"></path></svg>`) as SVGElement,
  }
}