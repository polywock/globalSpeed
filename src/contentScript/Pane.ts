import { createPaneIcons } from "../defaults/icons"

export class Pane {
  div = document.createElement("div")
  innerDiv = document.createElement("div")
  sDiv = new ScalableDiv(this.div)
  hasBorder = true 
  colorInput: HTMLInputElement
  public releaseCb: () => void
  constructor(private filter: string, isClone = false) {
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

    icons.paintRoller.addEventListener("click", e => {
      if (this.colorInput) {
        delete this.colorInput
        this.sync()
      } else {
        this.colorInput = document.createElement("input")
        this.colorInput.type = 'color'
        this.colorInput.addEventListener("input", this.sync)
        this.colorInput.click()
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

    if (this.colorInput) {
      this.innerDiv.style.backgroundColor = this.colorInput.value;
      (this.innerDiv.style as any).backdropFilter = "none"
    } else {
      (this.innerDiv.style as any).backdropFilter = this.filter
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
      style.textContent = `
        .pane:focus { outline: none; }
        .pane.hasBorder:focus { outline: 2px solid black; }

        .menu {
          position: absolute;
          right: 3px;
          top: 3px;
          display: none;
          grid-auto-flow: column;
          justify-content: right;
          grid-column-gap: 5px;
          font-size: 16px;
        }

        .inner {
          width: 100%;
          height: 100%;
        }

        .pane:focus > .menu, .pane:hover > .menu {
          display: grid;
        }

        svg {
          opacity: 0.5;
          background-color: black;
          color: white;
          padding: 5px;
        }

        svg:hover {
          opacity: 1;
        }
      `
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
    const pane = new Pane(src.filter, true)
    pane.colorInput = src.colorInput ? (src.colorInput.cloneNode() as HTMLInputElement) : null
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

const HOT_ZONE = 20
const MIN_WIDTH = 150
const MIN_HEIGHT = 100 

enum Transform {
  X_LEFT = 1,
  X_RIGHT,
  Y_TOP,
  Y_BOTTOM,
  MOVING
}

export class ScalableDiv {
  width = 500 
  height = 350 
  x = (window.innerWidth - this.width) / 2 + window.scrollX
  y = (window.innerHeight - this.height) / 2 + window.scrollY

  ref?: {
    x: number,
    y: number,
    width: number,
    height: number,
    cursorX: number,
    cursorY: number,
    transforms: Set<Transform>
  }
  public handleDimChange: () => void 
  constructor(public div: HTMLDivElement) {
    this.div.addEventListener("mousedown", this.handleMouseDown)
    this.sync()
  }
  release = () => {
    this.handleMouseUp()
    this.div.remove()
    this.div.removeEventListener("mousedown", this.handleMouseDown)
  }
  handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return 
    e.stopImmediatePropagation()
    if (this.ref) {
      this.handleMouseUp()
      return 
    }
    const transforms = new Set<Transform>()
    if (e.offsetX < HOT_ZONE) {
      transforms.add(Transform.X_LEFT) 
    } else if (this.width - e.offsetX < HOT_ZONE) {
      transforms.add(Transform.X_RIGHT)
    } 
    if (e.offsetY < HOT_ZONE) {
      transforms.add(Transform.Y_TOP)
    } else if (this.height - e.offsetY < HOT_ZONE) {
      transforms.add(Transform.Y_BOTTOM)
    } 
    
    if (transforms.size === 0){
      transforms.add(Transform.MOVING)
    }

    this.ref = {x: this.x, y: this.y, width: this.width, height: this.height, cursorX: e.pageX, cursorY: e.pageY, transforms}
    window.addEventListener("mousemove", this.handleMouseMove, {capture: true, passive: true})
    window.addEventListener("mouseup", this.handleMouseUp, {capture: true, passive: true})
  }
  handleMouseUp = () => {
    delete this.ref
    window.removeEventListener("mousemove", this.handleMouseMove, {capture: true})
    window.removeEventListener("mouseup", this.handleMouseUp, {capture: true})
  }
  handleMouseMove = (e: MouseEvent) => {
    if (!this.ref) {
      this.handleMouseUp()
      return 
    }

    var newDims = {
      x: this.x, 
      y: this.y, 
      width: this.width, 
      height: this.height
    }
    
    const deltaX = e.pageX - this.ref.cursorX
    const deltaY = e.pageY - this.ref.cursorY
    
    if (this.ref.transforms.has(Transform.X_LEFT)) {
      newDims.width = Math.max(this.ref.width - deltaX, MIN_WIDTH) 
      newDims.x = this.ref.x - (newDims.width - this.ref.width)
    } else if (this.ref.transforms.has(Transform.X_RIGHT)) {
      newDims.width = this.ref.width + deltaX
    } 
    if (this.ref.transforms.has(Transform.Y_TOP)) {
      newDims.height = Math.max(this.ref.height - deltaY, MIN_HEIGHT) 
      newDims.y = this.ref.y - (newDims.height - this.ref.height)
    } else if (this.ref.transforms.has(Transform.Y_BOTTOM)) {
      newDims.height = this.ref.height + (e.pageY - this.ref.cursorY)
    } 
    if (this.ref.transforms.has(Transform.MOVING)) {
      newDims.x  = this.ref.x + deltaX
      newDims.y  = this.ref.y + deltaY
    } 
    
    this.width = Math.max(MIN_WIDTH, newDims.width)
    this.height = Math.max(MIN_HEIGHT, newDims.height)
    this.x = newDims.x // Math.max(0, newDims.x)
    this.y = newDims.y // Math.max(0, newDims.y)

    this.sync()
  }

  sync() {
    this.div.style.width = `${this.width}px`
    this.div.style.height = `${this.height}px`
    this.div.style.position = "absolute"
    this.div.style.left = `${this.x}px`
    this.div.style.top = `${this.y}px`
    this.div.style.zIndex = "99999999999"
    this.div.style.userSelect = "none"
  }
}


