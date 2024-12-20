import { areYouSure, assertType, clamp, randomNumber } from "src/utils/helper"
import styles from "./styles.css?raw"
import pageStyles from "./stylesAux.css?raw"
import debounce from "lodash.debounce"
import { requestGsm } from "src/utils/gsm"
import { replaceArgs } from "src/utils/helper"
import { Gsm } from "src/utils/GsmType"
import { createElement as m } from "src/utils/helper"
import { Popover } from "../isolated/utils/Popover"

const ERASER_MIN = 5
const ERASER_MAX = 200
const BRUSH_MIN = 1
const BRUSH_MAX = 40

declare global {
    interface GlobalVar {
        pageDraw: PageDraw,
        gsm: Gsm
    }
}

type Point = { x: number, y: number }
type Rect = { width: number, height: number }
type Mode = "DRAW" | "ERASE" | "SELECT"

class PageDraw extends Popover {
    released = false
    scrollElement = document.scrollingElement
    latestDimension: Rect = { width: this.scrollElement.scrollWidth, height: this.scrollElement.scrollHeight }
    mask = createElement("div", { id: "mask" })
    resist = createElement("div", { id: "resist" })
    canvas = document.createElement("canvas")
    style = document.createElement("style")
    pageStyle = document.createElement("style")
    ctx = this.canvas.getContext("2d")
    controls: Controls
    
    on = false
    isDrawing: { scaleMode: boolean, erase: boolean, button: number, id: PointerEvent["pointerId"], refX: number, refY: number, refD: number, refE: number } = null
    latestPoint: Point
    points: Point[] = []
    hidden = false
    scrolling = false
    eraseColor?: string 
    drewSomething = false

    mode: Mode = "DRAW"
    color = "red"
    eraserSize = 44
    brushSize = 5
    eraseCursor = getCircleCursor(this.eraserSize / 2)
    sizeCursor: string

    constructor() {
        super()
        window.addEventListener("resize", this.handleResizeDeb, { capture: true, passive: true })
        this.canvas.addEventListener("contextlost", this.handleContextLost, { capture: true, passive: true })
        window.addEventListener("wheel", this.handleWheel, { capture: true, passive: true })
        window.addEventListener("keydown", this.handleKeyDown, true)
        window.addEventListener("keyup", this.handleKeyUp, true)

        this._div.addEventListener("contextmenu", this.handleContext, true)
        this._div.addEventListener("pointerdown", this.handlePointerDown, { capture: true, passive: true })
        this._div.addEventListener("pointerup", this.handlePointerUp, { capture: true, passive: true })
        this._div.addEventListener("pointermove", this.handlePointerMoveDeb, { capture: true, passive: true })
        this._wrapper.addEventListener("pointerleave", this.handlePointerLeave)
        document.addEventListener("pointerleave", this.clearIsDrawing)

        this.pageStyle.innerHTML = pageStyles
        document.documentElement.appendChild(this.pageStyle)

        this.style.innerHTML = styles
        this.resist.appendChild(this.canvas)
        this._div.appendChild(this.style)
        this._div.appendChild(this.mask)
        this._div.appendChild(this.resist)
        this.controls = new Controls(this)

        this.sync()
        this.handleResize()
        this._update(true)
    }
    release = () => {
        if (this.released) return
        this.released = true
        this.ensureOff()
        this.controls.release()
        delete this.controls
        window.removeEventListener("resize", this.handleResizeDeb, true)
        this.canvas.removeEventListener("contextlost", this.handleContextLost, true)
        window.removeEventListener("wheel", this.handleWheel, true)
        window.removeEventListener("keydown", this.handleKeyUp, true)
        window.removeEventListener("keyup", this.handleKeyUp, true)

        this._div.removeEventListener("contextmenu", this.handleContext, true)
        this._div.removeEventListener("pointerdown", this.handlePointerDown, true)
        this._div.removeEventListener("pointerup", this.handlePointerUp, true)
        this._div.removeEventListener("pointermove", this.handlePointerMove, true)
        this._wrapper.removeEventListener("pointerleave", this.handlePointerLeave)
        document.removeEventListener("pointerleave", this.clearIsDrawing)
        delete this.eraseCursor, delete this.sizeCursor
        this._release()
    }
    handleContextLost = (e: Event) => {
        gvar.pageDraw?.release()
        delete gvar.pageDraw
        gvar.pageDraw = new PageDraw()
    }
    sync = () => {
        this.syncCursor()
        if (this.mode !== "SELECT" && !this.hidden && !this.scrolling) {
            this.ensureOn()
        } else {
            this.ensureOff()
        }

        if (this.hidden) {
            this.resist.style.opacity = "0"
            this.controls.m.wrapper.classList.add("hidden")
        } else {
            this.resist.style.opacity = "1"
            this.controls.m.wrapper.classList.remove("hidden")
        }
    }
    renewEraserCursor = () => {
        this.eraseCursor = getCircleCursor(Math.min(this.eraserSize / 2, 64))
    }
    renewSizeCursor = () => {
        if (!this.isDrawing) return
        const size = this.isDrawing.erase ? this.eraserSize : this.brushSize * 2
        this.sizeCursor = getCircleCursor(Math.min(size / 2, 64))
    }
    syncCursor = () => {
        if (this.isDrawing) {
            if (this.isDrawing.scaleMode) {
                this.resist.style.cursor = this.sizeCursor
            } else if (this.isDrawing.erase) {
                this.resist.style.cursor = this.eraseCursor
            } else {
                this.resist.style.cursor = "crosshair"
            }
        } else {
            this.resist.style.cursor = this.mode === "ERASE" ? this.eraseCursor : "crosshair"
        }
    }
    handleResize = (e?: PointerEvent) => {
        this.controls.wrapper.sync()
        this.resist.style.display = "none"
        const rect: Rect = { width: this.scrollElement.scrollWidth, height: this.scrollElement.scrollHeight }
        this.resist.style.display = "block"
        if (e && this.latestDimension.width === rect.width && this.latestDimension.height === rect.height) return
        this.latestDimension = rect
        this.resist.style.width = this._div.style.width = `${rect.width}px` 
        this.resist.style.height = this._div.style.height = `${rect.height}px`
        if (this.canvas.width >= rect.width && this.canvas.height >= rect.height) return

        let data: ImageData
        if (e) data = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
        this.canvas.width = rect.width
        this.canvas.height = rect.height

        this.canvas.width = this.scrollElement.scrollWidth
        this.canvas.height = this.scrollElement.scrollHeight
        data && this.ctx.putImageData(data, 0, 0)
    }
    handleResizeDeb = debounce(this.handleResize, 500, { trailing: true })
    handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === "CapsLock") this.handleCapsLock(e)
    }
    handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "CapsLock") this.handleCapsLock(e)
    }
    handleCapsLock = (e: KeyboardEvent) => {
        if (this.hidden) return
        const capsLock = e.getModifierState("CapsLock")
        this.controls.m[capsLock ? "selectMode" : "drawMode"].click()
        e.stopImmediatePropagation()
        e.preventDefault()
    }
    ensureOn = () => {
        if (this.on) return
        document.documentElement.classList.add("noUseraSelect")
        this.on = true
        this._wrapper.style.pointerEvents = "all"
        this.resist.style.pointerEvents = "all"
        this.mask.style.pointerEvents = "all"
    }
    ensureOff = () => {
        if (!this.on) return
        document.documentElement.classList.remove("noUseraSelect")
        this.on = false
        this._wrapper.style.pointerEvents = this.scrolling ? "none" : "all"
        this.resist.style.pointerEvents = "none"
        this.mask.style.pointerEvents = "none"
        this.points = []
        this.clearIsDrawing()
    }
    clearIsDrawing = () => {
        if (!this.isDrawing) return
        if (this.isDrawing.scaleMode) {
            this.renewEraserCursor()
            delete this.sizeCursor
        }
        this.isDrawing = null
        this.syncCursor()
    }
    handleWheel = (e: WheelEvent) => {
        if (this.scrolling) {
            this.clearScrollDeb()
            return
        } else {
            if (!this.on) return
        }

        document.documentElement.classList.add("noUseraSelectScroll")
        this.scrolling = true
        this.clearScrollDeb()
        this.sync()
    }
    clearScroll = () => {
        if (!this.scrolling) return
        this.scrolling = false
        document.documentElement.classList.remove("noUseraSelectScroll")
        this.sync()
    }
    clearScrollDeb = debounce(this.clearScroll, 300, { trailing: true })
    handleContext = (e: MouseEvent) => this.on && e.preventDefault()
    handlePointerDown = (e: PointerEvent) => {
        if (e.target === this.controls.m.header) {
            this.controls.wrapper.handlePointerDown(e)
            return
        }
        if (!this.on) return
        if (e.target === this.mask) this.handleResize(e)
        if (e.target !== this.canvas) return


        this.points = []
        if (this.isDrawing) {
            this.clearIsDrawing()
            return
        }

        let erase = this.mode === "ERASE"
        if (e.button === 2) erase = !erase

        if (e.shiftKey && this.latestPoint) {
            this.drawLine(this.latestPoint, { x: e.pageX, y: e.pageY }, e.pointerType === "pen" ? e.pressure : null, erase)
        } else {
            this.isDrawing = { scaleMode: e.altKey || e.button === 1, erase, button: e.button, id: e.pointerId, refX: e.clientX, refY: e.clientY, refE: this.eraserSize, refD: this.brushSize }
            if (this.isDrawing.scaleMode) this.renewSizeCursor()
            this.syncCursor()
            this.handlePointerMove(e)
        }
    }
    handlePointerUp = (e: PointerEvent) => {
        if (!this.on) return
        this.latestPoint = { x: e.pageX, y: e.pageY }
        if (this.isDrawing && this.isDrawing.button === e.button && this.isDrawing.id === e.pointerId) {
            this.points = []
            this.clearIsDrawing()
        }
    }
    handlePointerMove = (e: PointerEvent) => {
        if (!this.on) return
        if (!this.isDrawing) return

        if (
            (e.clientX >= window.innerWidth || e.clientX <= 0) || 
            (e.clientY >= window.innerHeight || e.clientY <= 0)
        ) {

        }

        if (this.points.length > 500) {
            this.points.splice(0, 490)
        }
        this.latestPoint = { x: e.pageX, y: e.pageY }
        this.points.push(this.latestPoint)

        if (this.isDrawing.scaleMode) {
            const deltaX = (e.clientX - this.isDrawing.refX)
            const deltaY = (this.isDrawing.refY - e.clientY)
            this.isDrawing.erase = Math.abs(deltaX) > Math.abs(deltaY)
            if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 20) {
                return 
            } 

            if (this.isDrawing.erase) {
                const ratioX = deltaX / window.innerWidth
                this.eraserSize = clamp(ERASER_MIN, ERASER_MAX, this.isDrawing.refE + ratioX * (ERASER_MAX - ERASER_MIN))
                this.brushSize = this.isDrawing.refD
            } else {
                const ratioY = deltaY / window.innerHeight
                this.brushSize = clamp(BRUSH_MIN, BRUSH_MAX, this.isDrawing.refD + ratioY * (BRUSH_MAX - BRUSH_MIN))
                this.eraserSize = this.isDrawing.refE
            }
            this.controls.syncSize()
            this.renewSizeCursor()
            this.syncCursor()
            return
        }

        if (this.points.length < 2) return

        const origin = this.points.at(-2) // end 
        this.drawLine(origin, this.latestPoint, e.pointerType === "pen" ? e.pressure : null)
        return
    }
    handlePointerMoveDeb = this.handlePointerMove
    handlePointerLeave = (e: PointerEvent) => {
        if (this.isDrawing?.scaleMode) this.clearIsDrawing()
    }
    drawLine = (og: Point, dest: Point, pressure?: number, oneTimeErase?: boolean) => {
        this.ctx.lineCap = 'round';
        this.ctx.beginPath()
        this.ctx.moveTo(og.x, og.y)
        this.ctx.lineTo(dest.x, dest.y)

        this.ctx.lineWidth = this.brushSize * (pressure ?? 1)
        this.ctx.strokeStyle = this.color

        if (this.isDrawing?.erase || oneTimeErase) {
            if (this.eraseColor) {
                this.ctx.strokeStyle = this.eraseColor
            } else {
                this.ctx.globalCompositeOperation = 'destination-out'
            }
            this.ctx.lineWidth = this.eraserSize
        } else {
            this.drewSomething = true
        }

        this.ctx.stroke()
        this.ctx.globalCompositeOperation = 'source-over'
    }
}

const COLORS = "red, green, blue, black, purple".split(", ")
const COLORS2 = "pink, aquamarine, lightskyblue, white, yellow".split(", ")

class Controls {
    released = false
    wrapper = new MoveableWrapper()
    m = createScaffold(this.wrapper.div)


    constructor(private pd: PageDraw) {
        gvar.gsm.pageDraw._labelScale && this.wrapper.div.style.setProperty("--label-scale", gvar.gsm.pageDraw._labelScale.toString())
        pd._div.appendChild(this.m.wrapper)
        pd._div.addEventListener("click", this.handleClick, true)
        pd._div.addEventListener("contextmenu", this.handleContextMenu, true)
        pd._div.addEventListener("mid", this.handleContextMenu, true)
        pd._div.addEventListener("input", this.handleInput, true)
        this.m.brushSizeRange.value = pd.brushSize.toString()
        this.m.eraserSizeRange.value = pd.eraserSize.toString()
        this.m.colorInput.addEventListener("input", this.handleColorInput, true)
    }
    release = () => {
        if (this.released) return
        this.released = true

        this.pd._div.removeEventListener("click", this.handleClick, true);
        this.pd._div.removeEventListener("input", this.handleInput, true)
        this.m.colorInput.removeEventListener("input", this.handleColorInput, true)
        this.wrapper.release()
        this.m.wrapper.remove()
        delete this.wrapper
        delete this.m 
    }
    syncSize = () => {
        this.m.brushSizeRange.value = this.pd.brushSize.toString()
        this.m.eraserSizeRange.value = this.pd.eraserSize.toString()
    }
    handleInput = (e: Event) => {
        assertType<HTMLInputElement>(e.target)
        this.pd.brushSize = this.m.brushSizeRange.valueAsNumber
        this.pd.eraserSize = this.m.eraserSizeRange.valueAsNumber
        if (e.target === this.m.eraserSizeRange) this.pd.renewEraserCursor()
    }
    handleColorInput = (e: Event) => {
        this.pd.color = this.m.colorInput.value
        this.m.dropper.classList.add("selected")
        this.m.colors.forEach(c => c.classList.remove("selected"))
    }
    lastClicked?: {color: string, times: number[]}
    handleClick = (e: MouseEvent) => {
        assertType<HTMLButtonElement>(e.target)
        if (e.target.classList.contains("color")) {
            this.pd.color = e.target.style.backgroundColor
            this.m.colors.forEach(c => c.classList.remove("selected"))
            this.m.dropper.classList.remove("selected")
            e.target.classList.add("selected")
            
            if (!(this.lastClicked?.color === e.target.style.backgroundColor)) {
                delete this.lastClicked
                this.lastClicked = {color: e.target.style.backgroundColor, times: []}
            }
            let now = Date.now()
            this.lastClicked.times.push(now)
            this.lastClicked.times = this.lastClicked.times.slice(-3)
            if (this.lastClicked.times.length === 3 && this.lastClicked.times.every(t => (now - t) < 4000)) {
                this.lastClicked.times = []
                if (areYouSure()) {
                    if (this.pd.eraseColor === this.lastClicked.color) {
                        delete this.pd.eraseColor
                        return 
                    }
                    this.pd.eraseColor = this.lastClicked.color
                    this.pd.ctx.fillStyle = this.lastClicked.color
                    this.pd.ctx.fillRect(0, 0, this.pd.canvas.width, this.pd.canvas.height)
                    this.pd.ctx.fillStyle = ""
                }
            }
        } else if (e.target === this.m.remove) {
            if (!this.pd.drewSomething || document.fullscreenElement || confirm(gvar.gsm.options.help.areYouSure)) {
                gvar.pageDraw?.release()
                delete gvar.pageDraw
            }
        } else if (e.target === this.m.clear) {
            if (!this.pd.drewSomething || document.fullscreenElement || confirm(gvar.gsm.options.help.areYouSure)) {
                this.pd.ctx.clearRect(0, 0, this.pd.canvas.width, this.pd.canvas.height)
                this.pd.drewSomething = false
            }
        } else if (e.target === this.m.dropper) {
            setTimeout(() => {
                this.m.colorInput.click()
            }, 100)
        } else if (e.target === this.m.random) {
            this.m.colors.forEach(c => {
                c.style.backgroundColor = randomColor()
                c.classList.remove("selected")
            })
        }else if (e.target === this.m.hide) {
            this.pd.hidden = !this.pd.hidden
            this.pd.sync()
        } else if (e.target === this.m.help) {
            alert(replaceArgs(gvar.gsm.pageDraw.tips, [gvar.gsm.pageDraw.draw, gvar.gsm.pageDraw.select]))
        } else if (e.target.id?.includes("Mode")) {
            const mode = e.target.id.slice(0, -4).toLowerCase()
            const modes = ["draw", "erase", "select"]
            if (modes.includes(mode)) {
                this.pd.mode = mode.toUpperCase() as Mode
                this.pd.sync()
                for (let m of modes) {
                    const element = (this.m[`${m}Mode` as keyof ReturnType<typeof createScaffold>] as HTMLElement)
                    m === mode ? element.classList.add("selected") : element.classList.remove("selected")
                }
            }
        }
    }
    handleContextMenu = (e: MouseEvent) => {
        assertType<HTMLButtonElement>(e.target)
        if (e.target.classList.contains("color") && areYouSure()) {
            this.pd.ctx.fillStyle = e.target.style.backgroundColor
            this.pd.ctx.fillRect(0, 0, this.pd.canvas.width, this.pd.canvas.height)
            this.pd.ctx.fillStyle = ""
        }
    }
}


type ElementInit = { id?: string, classes?: string[] }

function createElement(tag: string, init?: ElementInit) {
    const elem = document.createElement(tag)
    if (init?.id) elem.id = init.id
    if (init?.classes?.length) {
        elem.setAttribute("class", init.classes.join(" "))
    }
    return elem
}


function getCircleWebAccessible(radius: number) {
    const nearestDiameter = clamp(1, 8, Math.round((radius * 2) / 16)) * 16
    const newRadius = Math.round(nearestDiameter / 2)
    const url = chrome.runtime.getURL(`circles/${nearestDiameter}.svg`)
    return `url("${url}") ${newRadius} ${newRadius}`
}

function getCircleDataUrl(radius: number) {
    const svg = `<svg width="${radius * 2}" height="${radius * 2}" xmlns="http://www.w3.org/2000/svg"><circle cx="${radius}" cy="${radius}" r="${radius - 1}" fill="#ffffff44" stroke="#00000044" stroke-width="2" /></svg>`
    const encodedSvg = encodeURIComponent(svg.trim())
    const url = `data:image/svg+xml,${encodedSvg}`
    return `url("${url}") ${radius} ${radius}`
}


function getCircleCursor(radius: number) {
    return `${getCircleDataUrl(radius)}, ${getCircleWebAccessible(radius)}, crosshair`;
}


const createScaffold = (wrapper: HTMLDivElement) => {
    const header = createElement("div", { id: "header" }) as HTMLDivElement
    const main = createElement("div", { id: "main" }) as HTMLDivElement

    const mode = createElement("div", { id: "mode" }) as HTMLDivElement
    mode.style.setProperty("--mode-font-scalar", (gvar.gsm.pageDraw._fontScale ?? 1).toString())
    const color = createElement("div", { id: "color" }) as HTMLDivElement
    const brushSize = createElement("div", { id: "brushSize" }) as HTMLDivElement
    const eraserSize = createElement("div", { id: "eraserSize" }) as HTMLDivElement

    const headerLabel = createElement("div", { id: "headerLabel" }) as HTMLSpanElement
    const h = gvar.gsm.command.drawPage
    headerLabel.innerText = h[0].toLocaleUpperCase(gvar.gsm._lang).concat(h.slice(1))
    const grip = m(`<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke-width="2" d="M15,5 L17,5 L17,3 L15,3 L15,5 Z M7,5 L9,5 L9,3 L7,3 L7,5 Z M15,13 L17,13 L17,11 L15,11 L15,13 Z M7,13 L9,13 L9,11 L7,11 L7,13 Z M15,21 L17,21 L17,19 L15,19 L15,21 Z M7,21 L9,21 L9,19 L7,19 L7,21 Z"></path></svg>`) as HTMLButtonElement
    const clear = m(`<button class="iconButton" id="clear"><svg stroke="currentColor" fill="currentColor" stroke-width="0" t="1569683368540" viewBox="0 0 1024 1024" version="1.1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><defs></defs><path d="M899.1 869.6l-53-305.6H864c14.4 0 26-11.6 26-26V346c0-14.4-11.6-26-26-26H618V138c0-14.4-11.6-26-26-26H432c-14.4 0-26 11.6-26 26v182H160c-14.4 0-26 11.6-26 26v192c0 14.4 11.6 26 26 26h17.9l-53 305.6c-0.3 1.5-0.4 3-0.4 4.4 0 14.4 11.6 26 26 26h723c1.5 0 3-0.1 4.4-0.4 14.2-2.4 23.7-15.9 21.2-30zM204 390h272V182h72v208h272v104H204V390z m468 440V674c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v156H416V674c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v156H202.8l45.1-260H776l45.1 260H672z"></path></svg></button>`)

    const help = m(`<button class="iconButton" id="help"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 1024 1024" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M764 280.9c-14-30.6-33.9-58.1-59.3-81.6C653.1 151.4 584.6 125 512 125s-141.1 26.4-192.7 74.2c-25.4 23.6-45.3 51-59.3 81.7-14.6 32-22 65.9-22 100.9v27c0 6.2 5 11.2 11.2 11.2h54c6.2 0 11.2-5 11.2-11.2v-27c0-99.5 88.6-180.4 197.6-180.4s197.6 80.9 197.6 180.4c0 40.8-14.5 79.2-42 111.2-27.2 31.7-65.6 54.4-108.1 64-24.3 5.5-46.2 19.2-61.7 38.8a110.85 110.85 0 0 0-23.9 68.6v31.4c0 6.2 5 11.2 11.2 11.2h54c6.2 0 11.2-5 11.2-11.2v-31.4c0-15.7 10.9-29.5 26-32.9 58.4-13.2 111.4-44.7 149.3-88.7 19.1-22.3 34-47.1 44.3-74 10.7-27.9 16.1-57.2 16.1-87 0-35-7.4-69-22-100.9zM512 787c-30.9 0-56 25.1-56 56s25.1 56 56 56 56-25.1 56-56-25.1-56-56-56z"></path></svg></path></svg></button>`) as HTMLButtonElement
    const hide = m(`<button class="iconButton" id="hide"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 1024 1024" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M942.2 486.2C847.4 286.5 704.1 186 512 186c-192.2 0-335.4 100.5-430.2 300.3a60.3 60.3 0 0 0 0 51.5C176.6 737.5 319.9 838 512 838c192.2 0 335.4-100.5 430.2-300.3 7.7-16.2 7.7-35 0-51.5zM512 766c-161.3 0-279.4-81.8-362.7-254C232.6 339.8 350.7 258 512 258c161.3 0 279.4 81.8 362.7 254C791.5 684.2 673.4 766 512 766zm-4-430c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm0 288c-61.9 0-112-50.1-112-112s50.1-112 112-112 112 50.1 112 112-50.1 112-112 112z"></path></svg></button>`) as HTMLButtonElement
    const remove = m(`<button class="iconButton" id="remove"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 1024 1024" fill-rule="evenodd" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M799.855 166.312c.023.007.043.018.084.059l57.69 57.69c.041.041.052.06.059.084a.118.118 0 0 1 0 .069c-.007.023-.018.042-.059.083L569.926 512l287.703 287.703c.041.04.052.06.059.083a.118.118 0 0 1 0 .07c-.007.022-.018.042-.059.083l-57.69 57.69c-.041.041-.06.052-.084.059a.118.118 0 0 1-.069 0c-.023-.007-.042-.018-.083-.059L512 569.926 224.297 857.629c-.04.041-.06.052-.083.059a.118.118 0 0 1-.07 0c-.022-.007-.042-.018-.083-.059l-57.69-57.69c-.041-.041-.052-.06-.059-.084a.118.118 0 0 1 0-.069c.007-.023.018-.042.059-.083L454.073 512 166.371 224.297c-.041-.04-.052-.06-.059-.083a.118.118 0 0 1 0-.07c.007-.022.018-.042.059-.083l57.69-57.69c.041-.041.06-.052.084-.059a.118.118 0 0 1 .069 0c.023.007.042.018.083.059L512 454.073l287.703-287.702c.04-.041.06-.052.083-.059a.118.118 0 0 1 .07 0Z"></path></svg></button>`) as HTMLButtonElement
    header.appendChild(grip)
    header.appendChild(headerLabel)
    header.appendChild(help)
    header.appendChild(clear)
    header.appendChild(hide)
    header.appendChild(remove)

    const drawMode = m(`<button id="drawMode"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 16 16" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M15.825.12a.5.5 0 0 1 .132.584c-1.53 3.43-4.743 8.17-7.095 10.64a6.067 6.067 0 0 1-2.373 1.534c-.018.227-.06.538-.16.868-.201.659-.667 1.479-1.708 1.74a8.118 8.118 0 0 1-3.078.132 3.659 3.659 0 0 1-.562-.135 1.382 1.382 0 0 1-.466-.247.714.714 0 0 1-.204-.288.622.622 0 0 1 .004-.443c.095-.245.316-.38.461-.452.394-.197.625-.453.867-.826.095-.144.184-.297.287-.472l.117-.198c.151-.255.326-.54.546-.848.528-.739 1.201-.925 1.746-.896.126.007.243.025.348.048.062-.172.142-.38.238-.608.261-.619.658-1.419 1.187-2.069 2.176-2.67 6.18-6.206 9.117-8.104a.5.5 0 0 1 .596.04z"></path></svg><span>${gvar.gsm.pageDraw.draw}</span></button>`) as HTMLButtonElement
    drawMode.classList.add("selected")
    const eraseMode = m(`<button id="eraseMode"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 16 16" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm.66 11.34L3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16z"></path></svg><span>${gvar.gsm.pageDraw.erase}</span></button>`) as HTMLButtonElement
    const selectMode = m(`<button id="selectMode"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 320 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M302.189 329.126H196.105l55.831 135.993c3.889 9.428-.555 19.999-9.444 23.999l-49.165 21.427c-9.165 4-19.443-.571-23.332-9.714l-53.053-129.136-86.664 89.138C18.729 472.71 0 463.554 0 447.977V18.299C0 1.899 19.921-6.096 30.277 5.443l284.412 292.542c11.472 11.179 3.007 31.141-12.5 31.141z"></path></svg><span>${gvar.gsm.pageDraw.select}</span></button>`) as HTMLButtonElement
    selectMode.title = gvar.gsm.pageDraw.selectTooltip

    mode.appendChild(drawMode)
    mode.appendChild(eraseMode)
    mode.appendChild(selectMode)

    const colors = generateColors(COLORS)
    const colorsAlt = generateColors(COLORS2) 
    const colorInput = createElement("input", {id: "colorInput"}) as HTMLInputElement
    colorInput.type = 'color'
    const dropper = m(`<label for="colorInput" id="dropper"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 16 16" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M13.354.646a1.207 1.207 0 0 0-1.708 0L8.5 3.793l-.646-.647a.5.5 0 1 0-.708.708L8.293 5l-7.147 7.146A.5.5 0 0 0 1 12.5v1.793l-.854.853a.5.5 0 1 0 .708.707L1.707 15H3.5a.5.5 0 0 0 .354-.146L11 7.707l1.146 1.147a.5.5 0 0 0 .708-.708l-.647-.646 3.147-3.146a1.207 1.207 0 0 0 0-1.708l-2-2zM2 12.707l7-7L10.293 7l-7 7H2v-1.293z"></path></svg></label>`) as HTMLButtonElement
    dropper.appendChild(colorInput)
    const random = m(`<button id="random">
        <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M463.5 224H472c13.3 0 24-10.7 24-24V72c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L413.4 96.6c-87.6-86.5-228.7-86.2-315.8 1c-87.5 87.5-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8H463.5z"></path></svg>
    </button>`) as HTMLButtonElement
    colors.forEach(c => color.appendChild(c))
    color.appendChild(dropper)
    colorsAlt.forEach(c => color.appendChild(c))
    color.appendChild(random)
    colors.push(...colorsAlt)

    const brushSizeLabel = createElement("span") as HTMLSpanElement
    brushSizeLabel.innerText = gvar.gsm.pageDraw.draw
    const brushSizeRange = createElement("input") as HTMLInputElement
    brushSizeRange.type = "range"
    brushSizeRange.min = BRUSH_MIN.toString()
    brushSizeRange.max = BRUSH_MAX.toString()

    brushSize.appendChild(brushSizeLabel)
    brushSize.appendChild(brushSizeRange)

    const eraserSizeLabel = createElement("span") as HTMLSpanElement
    eraserSizeLabel.innerText = gvar.gsm.pageDraw.erase
    const eraserSizeRange = createElement("input") as HTMLInputElement
    eraserSizeRange.type = "range"
    eraserSizeRange.min = ERASER_MIN.toString()
    eraserSizeRange.max = ERASER_MAX.toString()

    eraserSize.appendChild(eraserSizeLabel)
    eraserSize.appendChild(eraserSizeRange)

    main.appendChild(mode)
    main.appendChild(color)
    main.appendChild(brushSize)
    main.appendChild(eraserSize)


    wrapper.appendChild(header)
    wrapper.appendChild(main)

    return {
        wrapper, header, main, mode, color, brushSize, eraserSize,
        headerLabel, grip, help, hide, clear, remove,
        drawMode, eraseMode, selectMode, colors, colorInput, 
        dropper, random, brushSizeLabel, brushSizeRange,
        eraserSizeLabel, eraserSizeRange
    }
}

function generateColors(colors: string[]) {
    return colors.map(c => {
        const b = document.createElement("button")
        b.classList.add("color")
        b.style.backgroundColor = c
        b.innerHTML = "​"
        if (c === "red") b.classList.add("selected")
        return b
    })
}

class MoveableWrapper {
    div = createElement("div", { id: "wrapper" }) as HTMLDivElement
    x = 100
    y = 100

    ref?: {
        x: number,
        y: number,
        cursorX: number,
        cursorY: number,
    }
    released = false
    constructor() {
        this.sync()
    }
    release = () => {
        if (this.released) return
        this.released = true
        this.div.remove()
        delete this.ref
        delete this.div
        window.removeEventListener("pointermove", this.handlePointerMove, true)
        window.removeEventListener("pointerup", this.handlePointerUp, true)
    }
    handlePointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return

        if (this.ref) {
            this.handlePointerUp()
            return
        }

        this.ref = { x: this.x, y: this.y, cursorX: e.pageX, cursorY: e.clientY }
        window.addEventListener("pointermove", this.handlePointerMove, { capture: true, passive: true })
        window.addEventListener("pointerup", this.handlePointerUp, { capture: true, passive: true })
    }
    handlePointerUp = () => {
        delete this.ref
        window.removeEventListener("pointermove", this.handlePointerMove, { capture: true })
        window.removeEventListener("pointerup", this.handlePointerUp, { capture: true })
    }
    handlePointerMove = (e: MouseEvent) => {
        if (!this.ref) {
            this.handlePointerUp()
            return
        }

        var newDims = {
            x: this.x,
            y: this.y
        }

        const deltaX = e.clientX - this.ref.cursorX
        const deltaY = e.clientY - this.ref.cursorY

        newDims.x = this.ref.x + deltaX
        newDims.y = this.ref.y + deltaY

        this.x = newDims.x
        this.y = newDims.y

        this.sync()
    }
    sync() {
        this.x = clamp(10, window.innerWidth - this.div.clientWidth - 20, this.x)
        this.y = clamp(10, window.innerHeight - this.div.clientHeight - 20, this.y)
        this.div.style.left = `${this.x}px`
        this.div.style.top = `${this.y}px`
    }
}

function randomColor() {
    return `rgb(${randomNumber(0, 256)}, ${randomNumber(0, 256)}, ${randomNumber(0, 256)})`
}

(async () => {
    if (!gvar.pageDraw) {
        // placeholder to avoid instantiating multiple times while GSM loads.
        gvar.pageDraw = "placeholder" as any
        try {
            if (!gvar.gsm) {
                const gsm = await requestGsm()
                gvar.gsm = gsm 
            }
        } finally {
            delete gvar.pageDraw 
        }
        gvar.pageDraw = new PageDraw()
    } 
})()


