import debounce from "lodash.debounce"
import { requestGsm } from "@/utils/gsm"
import { Gsm } from "@/utils/GsmType"
import { areYouSure, assertType, clamp, createElement as m, randomNumber, replaceArgs } from "@/utils/helper"
import {
	clockwiseIcon,
	crossIcon,
	cursorIcon,
	dropperIcon,
	eraserIcon,
	eyeIcon,
	flatBrushIcon,
	gripIcon,
	paintIcon,
	questionIcon,
} from "../../defaults/icons"
import { Popover } from "../isolated/utils/Popover"
import styles from "./styles.css?raw"
import pageStyles from "./stylesAux.css?raw"

const ERASER_MIN = 5
const ERASER_MAX = 200
const BRUSH_MIN = 1
const BRUSH_MAX = 40

declare global {
	interface GlobalVar {
		pageDraw: PageDraw
		gsm: Gsm
	}
}

type Point = { x: number; y: number }
type Rect = { width: number; height: number }
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
	isDrawing: {
		scaleMode: boolean
		erase: boolean
		button: number
		id: PointerEvent["pointerId"]
		refX: number
		refY: number
		refD: number
		refE: number
		shiftOrigin?: Point
		shiftAngle?: number
		shiftLastPoint?: Point
		shiftAtStart?: boolean
		previousPoint?: Point
	} = null
	latestPoint: Point
	latestPointTime: number = 0
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
		;(delete this.eraseCursor, delete this.sizeCursor)
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

		this.isDrawing = {
			scaleMode: e.altKey || e.button === 1,
			erase,
			button: e.button,
			id: e.pointerId,
			refX: e.clientX,
			refY: e.clientY,
			refE: this.eraserSize,
			refD: this.brushSize,
			shiftAtStart: e.shiftKey,
			previousPoint: this.latestPoint,
		}
		if (this.isDrawing.scaleMode) this.renewSizeCursor()
		this.syncCursor()
		this.handlePointerMove(e)
	}
	handlePointerUp = (e: PointerEvent) => {
		if (!this.on) return
		const upPoint = { x: e.pageX, y: e.pageY }

		if (this.isDrawing && this.isDrawing.button === e.button && this.isDrawing.id === e.pointerId) {
			// Check if this was a shift-click (released before angle locked)
			// If so, and we have a previous point, draw a line from it
			if (this.isDrawing.shiftAtStart && this.isDrawing.shiftAngle == null && this.isDrawing.previousPoint != null) {
				// User clicked (didn't move enough to lock angle) - draw line from previous point
				this.drawLine(this.isDrawing.previousPoint, upPoint, e.pointerType === "pen" ? e.pressure : null, this.isDrawing.erase)
			}
			this.points = []
			this.clearIsDrawing()
		}

		this.latestPoint = upPoint
		this.latestPointTime = Date.now()
	}
	handlePointerMove = (e: PointerEvent) => {
		if (!this.on) return
		if (!this.isDrawing) return

		if (e.clientX >= window.innerWidth || e.clientX <= 0 || e.clientY >= window.innerHeight || e.clientY <= 0) {
		}

		if (this.points.length > 500) {
			this.points.splice(0, 490)
		}
		this.latestPoint = { x: e.pageX, y: e.pageY }
		this.points.push(this.latestPoint)

		if (this.isDrawing.scaleMode) {
			const deltaX = e.clientX - this.isDrawing.refX
			const deltaY = this.isDrawing.refY - e.clientY
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

		const pressure = e.pointerType === "pen" ? e.pressure : null

		// Shift held during drawing: constrain to nearest 45° angle
		if (e.shiftKey || this.isDrawing.shiftAtStart) {
			// Initialize shift state when shift is first pressed or was held at start
			if (this.isDrawing.shiftOrigin == null) {
				// Find a stable origin point - look back to find a point at least 30px away
				let originPoint = this.latestPoint
				const minDistanceForOrigin = 30
				for (let i = this.points.length - 1; i >= 0; i--) {
					const pt = this.points[i]
					const d = Math.sqrt((this.latestPoint.x - pt.x) ** 2 + (this.latestPoint.y - pt.y) ** 2)
					if (d >= minDistanceForOrigin) {
						originPoint = pt
						break
					}
				}
				// If we couldn't find a point far enough, use the first point
				if (originPoint === this.latestPoint && this.points.length > 0) {
					originPoint = this.points[0]
				}
				this.isDrawing.shiftOrigin = originPoint
				this.isDrawing.shiftLastPoint = this.latestPoint
				// Angle will be determined after moving a minimum distance from origin
				this.isDrawing.shiftAngle = null
			}

			const dx = this.latestPoint.x - this.isDrawing.shiftOrigin.x
			const dy = this.latestPoint.y - this.isDrawing.shiftOrigin.y
			const distanceFromOrigin = Math.sqrt(dx * dx + dy * dy)

			// Wait until user moves at least 40 pixels from origin before locking the angle
			if (this.isDrawing.shiftAngle == null) {
				if (distanceFromOrigin < 40) {
					this.isDrawing.shiftLastPoint = this.latestPoint
					return
				}
				// Lock the angle based on direction from origin
				const angle = Math.atan2(dy, dx)
				this.isDrawing.shiftAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)

				// Draw the initial segment from origin to current position (making up for missed part)
				const cosA = Math.cos(this.isDrawing.shiftAngle)
				const sinA = Math.sin(this.isDrawing.shiftAngle)
				const projectedDist = dx * cosA + dy * sinA
				if (Math.abs(projectedDist) > 0.5) {
					const dest: Point = {
						x: this.isDrawing.shiftOrigin.x + cosA * projectedDist,
						y: this.isDrawing.shiftOrigin.y + sinA * projectedDist,
					}
					this.drawLine(this.isDrawing.shiftOrigin, dest, pressure)
					this.isDrawing.shiftOrigin = dest
				}
				this.isDrawing.shiftLastPoint = this.latestPoint
				this.points = [this.isDrawing.shiftOrigin]
				return
			}

			// Calculate distance moved from last point
			const prevPoint = this.isDrawing.shiftLastPoint
			const moveDx = this.latestPoint.x - prevPoint.x
			const moveDy = this.latestPoint.y - prevPoint.y
			// Project movement onto the locked angle direction
			const cosA = Math.cos(this.isDrawing.shiftAngle)
			const sinA = Math.sin(this.isDrawing.shiftAngle)
			const projectedDistance = moveDx * cosA + moveDy * sinA

			if (Math.abs(projectedDistance) > 0.5) {
				const dest: Point = {
					x: this.isDrawing.shiftOrigin.x + cosA * projectedDistance,
					y: this.isDrawing.shiftOrigin.y + sinA * projectedDistance,
				}
				this.drawLine(this.isDrawing.shiftOrigin, dest, pressure)
				this.isDrawing.shiftOrigin = dest
			}
			this.isDrawing.shiftLastPoint = this.latestPoint
			this.points = [this.isDrawing.shiftOrigin]
			return
		}

		// Shift released - clear the shift state
		if (this.isDrawing.shiftOrigin != null) {
			delete this.isDrawing.shiftOrigin
			delete this.isDrawing.shiftAngle
			delete this.isDrawing.shiftLastPoint
		}

		const origin = this.points.at(-2)
		this.drawLine(origin, this.latestPoint, pressure)
		return
	}
	handlePointerMoveDeb = this.handlePointerMove
	handlePointerLeave = (e: PointerEvent) => {
		if (this.isDrawing?.scaleMode) this.clearIsDrawing()
	}
	drawLine = (og: Point, dest: Point, pressure?: number, oneTimeErase?: boolean) => {
		this.ctx.lineCap = "round"
		this.ctx.beginPath()
		this.ctx.moveTo(og.x, og.y)
		this.ctx.lineTo(dest.x, dest.y)

		this.ctx.lineWidth = this.brushSize * (pressure != null ? pressure * 2 : 1)
		this.ctx.strokeStyle = this.color

		if (this.isDrawing?.erase || oneTimeErase) {
			if (this.eraseColor) {
				this.ctx.strokeStyle = this.eraseColor
			} else {
				this.ctx.globalCompositeOperation = "destination-out"
			}
			this.ctx.lineWidth = this.eraserSize
		} else {
			this.drewSomething = true
		}

		this.ctx.stroke()
		this.ctx.globalCompositeOperation = "source-over"
	}
	constrainTo45 = (origin: Point, dest: Point): Point => {
		const dx = dest.x - origin.x
		const dy = dest.y - origin.y
		const angle = Math.atan2(dy, dx)
		// Snap to nearest 45° (π/4 radians)
		const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
		const distance = Math.sqrt(dx * dx + dy * dy)
		return {
			x: origin.x + Math.cos(snappedAngle) * distance,
			y: origin.y + Math.sin(snappedAngle) * distance,
		}
	}
}

const COLORS = "red, green, blue, black, purple".split(", ")
const COLORS2 = "pink, aquamarine, lightskyblue, white, yellow".split(", ")

class Controls {
	released = false
	wrapper = new MoveableWrapper()
	m = createScaffold(this.wrapper.div)
	colorMenu: ControlsMenu = null
	isRandomColors = false

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
		this.closeColorMenu()
		this.pd._div.removeEventListener("click", this.handleClick, true)
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
		this.m.colors.forEach((c) => c.classList.remove("selected"))
	}
	handleClick = (e: MouseEvent) => {
		assertType<HTMLButtonElement>(e.target)
		if (e.target.classList.contains("color")) {
			this.pd.color = e.target.style.backgroundColor
			this.m.colors.forEach((c) => c.classList.remove("selected"))
			this.m.dropper.classList.remove("selected")
			e.target.classList.add("selected")
		} else if (e.target === this.m.remove) {
			if (!this.pd.drewSomething || document.fullscreenElement || areYouSure()) {
				gvar.pageDraw?.release()
				delete gvar.pageDraw
			}
		} else if (e.target === this.m.clear) {
			if (!this.pd.drewSomething || document.fullscreenElement || areYouSure()) {
				this.pd.ctx.clearRect(0, 0, this.pd.canvas.width, this.pd.canvas.height)
				delete this.pd.eraseColor
				this.pd.drewSomething = false
			}
		} else if (e.target === this.m.dropper) {
			setTimeout(() => {
				this.m.colorInput.click()
			}, 100)
		} else if (e.target === this.m.random) {
			this.isRandomColors = !this.isRandomColors
			const allColors = [...COLORS, ...COLORS2]
			this.m.colors.forEach((c, i) => {
				const color = this.isRandomColors ? randomColor() : allColors[i]
				c.style.backgroundColor = color
				c.classList.remove("selected")
				if (!this.isRandomColors && this.pd.color === color) {
					c.classList.add("selected")
				}
			})
		} else if (e.target === this.m.hide) {
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
					const element = this.m[`${m}Mode` as keyof ReturnType<typeof createScaffold>] as HTMLElement
					m === mode ? element.classList.add("selected") : element.classList.remove("selected")
				}
			}
		}
	}
	handleContextMenu = (e: MouseEvent) => {
		assertType<HTMLButtonElement>(e.target)
		if (e.target.classList.contains("color")) {
			e.preventDefault()
			e.stopPropagation()
			this.showColorMenu(e.target, e.clientX, e.clientY)
		}
	}
	showColorMenu = (target: HTMLButtonElement, x: number, y: number) => {
		if (this.colorMenu) {
			this.closeColorMenu()
		}

		this.colorMenu = new ControlsMenu(
			this.wrapper.div,
			x,
			y,
			[
				{
					label: gvar.gsm.pageDraw.floodPage,
					cb: () => {
						const color = target.style.backgroundColor
						this.pd.ctx.fillStyle = color
						this.pd.ctx.fillRect(0, 0, this.pd.canvas.width, this.pd.canvas.height)
						this.pd.ctx.fillStyle = ""
						this.closeColorMenu()
					},
				},
				{
					label: target.style.backgroundColor === this.pd.eraseColor ? gvar.gsm.pageDraw.clearBackground : gvar.gsm.pageDraw.setBackground,
					cb: () => {
						const color = target.style.backgroundColor
						if (color === this.pd.eraseColor) {
							delete this.pd.eraseColor
						} else {
							this.pd.eraseColor = color
							this.pd.ctx.fillStyle = color
							this.pd.ctx.fillRect(0, 0, this.pd.canvas.width, this.pd.canvas.height)
							this.pd.ctx.fillStyle = ""
						}
						this.closeColorMenu()
					},
				},
			],
			this.closeColorMenu,
		)
	}
	closeColorMenu = () => {
		this.colorMenu?.release()
		delete this.colorMenu
	}
}

type MenuItem = { label: string; cb: () => void }

class ControlsMenu {
	div: HTMLDivElement
	backdrop: HTMLDivElement

	constructor(parent: HTMLElement, x: number, y: number, items: MenuItem[], closeCb: () => void) {
		// Create backdrop that covers the screen
		this.backdrop = document.createElement("div")
		this.backdrop.id = "controlsMenuBackdrop"
		this.backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 0;
        `
		this.backdrop.addEventListener("pointerdown", () => closeCb())

		this.div = document.createElement("div")
		this.div.id = "colorContextMenu"
		this.div.style.left = `${x}px`
		this.div.style.top = `${y}px`

		// Prevent clicks from propagating
		this.div.addEventListener("click", (e) => e.stopPropagation())
		this.div.addEventListener("pointerdown", (e) => e.stopPropagation())

		for (const item of items) {
			const option = document.createElement("div")
			option.textContent = item.label
			option.addEventListener("click", () => item.cb())
			this.div.appendChild(option)
		}

		// Container to hold both backdrop and menu
		const container = document.createElement("div")
		container.appendChild(this.backdrop)
		container.appendChild(this.div)
		parent.appendChild(container)

		// Adjust position if menu goes off screen
		const rect = this.div.getBoundingClientRect()
		if (rect.right > window.innerWidth) {
			this.div.style.left = `${window.innerWidth - rect.width - 10}px`
		}
		if (rect.bottom > window.innerHeight) {
			this.div.style.top = `${window.innerHeight - rect.height - 10}px`
		}
	}

	release = () => {
		this.backdrop.parentElement?.remove()
	}
}

type ElementInit = { id?: string; classes?: string[] }

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
	return `${getCircleDataUrl(radius)}, ${getCircleWebAccessible(radius)}, crosshair`
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
	const grip = m(gripIcon) as HTMLButtonElement
	const clear = m(`<button class="iconButton" id="clear">${flatBrushIcon}</button>`)
	const help = m(`<button class="iconButton" id="help">${questionIcon}</button>`) as HTMLButtonElement
	const hide = m(`<button class="iconButton" id="hide">${eyeIcon}</button>`) as HTMLButtonElement
	const remove = m(`<button class="iconButton" id="remove">${crossIcon}</button>`) as HTMLButtonElement
	header.appendChild(grip)
	header.appendChild(headerLabel)
	header.appendChild(help)
	header.appendChild(clear)
	header.appendChild(hide)
	header.appendChild(remove)

	const drawMode = m(`<button id="drawMode">${paintIcon}<span>${gvar.gsm.pageDraw.draw}</span></button>`) as HTMLButtonElement
	drawMode.classList.add("selected")
	const eraseMode = m(`<button id="eraseMode">${eraserIcon}<span>${gvar.gsm.pageDraw.erase}</span></button>`) as HTMLButtonElement
	const selectMode = m(`<button id="selectMode">${cursorIcon}<span>${gvar.gsm.pageDraw.select}</span></button>`) as HTMLButtonElement
	selectMode.title = gvar.gsm.pageDraw.selectTooltip

	mode.appendChild(drawMode)
	mode.appendChild(eraseMode)
	mode.appendChild(selectMode)

	const colors = generateColors(COLORS)
	const colorsAlt = generateColors(COLORS2)
	const colorInput = createElement("input", { id: "colorInput" }) as HTMLInputElement
	colorInput.type = "color"
	const dropper = m(`<label for="colorInput" id="dropper">${dropperIcon}</label>`) as HTMLButtonElement
	dropper.appendChild(colorInput)
	const random = m(`<button id="random">
        ${clockwiseIcon}
    </button>`) as HTMLButtonElement
	colors.forEach((c) => color.appendChild(c))
	color.appendChild(dropper)
	colorsAlt.forEach((c) => color.appendChild(c))
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
		wrapper,
		header,
		main,
		mode,
		color,
		brushSize,
		eraserSize,
		headerLabel,
		grip,
		help,
		hide,
		clear,
		remove,
		drawMode,
		eraseMode,
		selectMode,
		colors,
		colorInput,
		dropper,
		random,
		brushSizeLabel,
		brushSizeRange,
		eraserSizeLabel,
		eraserSizeRange,
	}
}

function generateColors(colors: string[]) {
	return colors.map((c) => {
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
		x: number
		y: number
		cursorX: number
		cursorY: number
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
			y: this.y,
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

;(async () => {
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
