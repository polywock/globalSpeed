import { CommandName } from "@/defaults/commands"
import { FilterName } from "@/defaults/filters"
import { crossIcon, gripIcon, plusIcon, resetIcon } from "@/defaults/icons"
import { gvar } from "@/globalVar"
import { ItcInit, Keybind, StateView, StateViewSelector } from "@/types"
import { clamp, inverseLerp, lerp, createElement as m, randomId, round } from "@/utils/helper"
import { getItcSelector, getItcValues } from "@/utils/itcUtils"
import { insertStyle } from "@/utils/nativeUtils"
import { SubscribeView } from "@/utils/state"
import { Popover } from "../isolated/utils/Popover"
import styles from "./styles.css?inline"

declare global {
	interface GlobalVar {
		toggleItc?: typeof toggleItc
	}
}

const MARGIN = 12
const SEND_INTERVAL = 80
/** Rests against the left wall, clear of the popup on the right. */
const RESTING_X = 40

/** Add a slider for this keybind to the shared panel, or remove it if it's already there. */
export function toggleItc(init: ItcInit) {
	const panel = (gvar.os.itcPanel = gvar.os.itcPanel ?? new ItcPanel())
	panel.toggleRow(init)
}

/**
 * One draggable list of sliders, shared by every interactive keybind. Lives in the top
 * frame until its rows are gone, so the whole set can be moved and dismissed together.
 */
export class ItcPanel extends Popover {
	released = false
	panel = document.createElement("div")
	rows = new Map<string, ItcRow>()
	client?: SubscribeView
	x = RESTING_X
	y = MARGIN
	/** False until the user drags it, and until then it keeps to its resting place. */
	positioned = false
	/** Set while a pointer is down: a row means its slider, no row means moving the panel. */
	dragging?: { row?: ItcRow; pointerId: number; startValue?: number; startX: number; startY: number }
	openMenuRow?: ItcRow
	moveOffset = { x: 0, y: 0 }

	constructor() {
		super()
		this.panel.className = "panel"
		this._div.appendChild(this.panel)
		insertStyle(styles, this._shadow)

		this.drawPosition()
		this.panel.addEventListener("pointerdown", this.handleMoveDown)
		this.panel.addEventListener("pointermove", this.handlePointerMove)
		this.panel.addEventListener("pointerup", this.handlePointerUp)
		this.panel.addEventListener("pointercancel", this.handlePointerUp)
		this.panel.addEventListener("lostpointercapture", this.handleLostCapture)
		// A drag that ends off-window never reports a pointerup, so watch for the tab losing it.
		gvar.os.eListen.blurCbs.add(this.handleInterrupt)
		gvar.os.eListen.visibilityCbs.add(this.handleInterrupt)
		gvar.os.eListen.keyDownCbs.add(this.handleKeyDown)
		window.addEventListener("resize", this.handleResize)
		this._update(true)
	}
	release = () => {
		if (this.released) return
		this.released = true
		window.removeEventListener("resize", this.handleResize)
		gvar.os?.eListen.blurCbs.delete(this.handleInterrupt)
		gvar.os?.eListen.visibilityCbs.delete(this.handleInterrupt)
		gvar.os?.eListen.keyDownCbs.delete(this.handleKeyDown)
		this.rows.forEach((row) => row.release())
		this.rows.clear()
		this.client?.release()
		delete this.client
		if (gvar.os?.itcPanel === this) delete gvar.os.itcPanel
		this._release()
	}
	toggleRow = (init: ItcInit) => {
		if (this.rows.has(init.kb.id)) {
			this.removeRow(init.kb.id)
			return
		}
		const row = new ItcRow(this, init)
		this.rows.set(init.kb.id, row)
		this.panel.appendChild(row.el)
		this.syncRows()
	}
	/** Add a related type below `source`, using that command's own reference values. */
	addRow = async (source: ItcRow, key: string) => {
		this.closeMenu()
		const kb = { ...source.init.kb, id: randomId() } as Keybind
		if (kb.command === "fxFilter") {
			kb.filterOption = key as FilterName
		} else {
			kb.command = key as CommandName
		}
		// The source's slider bounds were configured for a different value entirely.
		;(delete kb.valueItcMin, delete kb.valueItcMax)

		const init = (await chrome.runtime.sendMessage({ type: "REQUEST_ITC_INIT", kb } as Messages)) as ItcInit
		if (!init || this.released) return

		const row = new ItcRow(this, init)
		this.rows.set(kb.id, row)
		source.el.after(row.el)
		this.syncRows()
	}
	/** A type is offered only while no row shows it, so the panel can't hold duplicates. */
	hasType = (key: string) => [...this.rows.values()].some((row) => row.typeKey === key)
	syncRows = () => {
		this.closeMenu()
		this.rows.forEach((row) => row.syncAdd())
		this.syncClient()
		this.handleResize()
	}
	closeMenu = () => {
		this.openMenuRow?.closeMenu()
		delete this.openMenuRow
	}
	removeRow = (id: string) => {
		const row = this.rows.get(id)
		if (!row) return
		if (this.dragging?.row === row) this.endDrag(false)
		row.release()
		this.rows.delete(id)

		// An empty panel is just an invisible pointer trap.
		if (!this.rows.size) {
			this.release()
			return
		}
		this.syncRows()
	}
	/** One subscription for the whole list, covering whatever its rows currently need. */
	syncClient = () => {
		this.client?.release()
		const selector: StateViewSelector = Object.assign({}, ...[...this.rows.values()].map((row) => getItcSelector(row.init.kb)))
		this.client = new SubscribeView(selector, gvar.tabInfo?.tabId, true, this.handleView, 100, 150)
	}
	handleView = (view: StateView) => {
		this.rows.forEach((row) => row.handleView(view))
	}
	drawPosition = () => {
		// Transform rather than left/top: dragging then costs no layout pass.
		this.panel.style.transform = `translate(${this.x}px, ${this.y}px)`
	}
	conformPosition = () => {
		const { width, height } = this.size()
		this.x = clamp(MARGIN, Math.max(MARGIN, window.innerWidth - width - MARGIN), this.x)
		this.y = clamp(MARGIN, Math.max(MARGIN, window.innerHeight - height - MARGIN), this.y)
	}
	size = () => ({ width: this.panel.offsetWidth || 260, height: this.panel.offsetHeight || 70 })
	rest = () => {
		this.x = RESTING_X
		this.y = (window.innerHeight - this.size().height) / 2
	}
	handleResize = () => {
		// Rows come and go after construction, so resting waits until there's a height.
		if (!this.positioned) this.rest()
		this.conformPosition()
		this.drawPosition()
	}
	/** Anywhere on the panel drags it. Sliders stop propagation, buttons we skip here. */
	handleMoveDown = (e: PointerEvent) => {
		const target = e.target as HTMLElement
		if (!target.closest?.(".menu, .add")) this.closeMenu()
		if (e.button || target.closest?.("button, .menu")) return
		e.preventDefault()
		e.stopPropagation()
		this.dragging = { pointerId: e.pointerId, startX: this.x, startY: this.y }
		this.panel.classList.add("moving")
		this.panel.setPointerCapture(e.pointerId)
		this.moveOffset = { x: e.clientX - this.x, y: e.clientY - this.y }
	}
	startValue = (e: PointerEvent, row: ItcRow) => {
		this.closeMenu()
		this.dragging = { row, pointerId: e.pointerId, startValue: row.value, startX: this.x, startY: this.y }
		this.panel.setPointerCapture(e.pointerId)
		row.setFromClientX(e.clientX, true)
	}
	handlePointerMove = (e: PointerEvent) => {
		if (!this.dragging) return
		// The button was let go somewhere we never heard about it.
		if (e.pointerType === "mouse" && !e.buttons) {
			this.endDrag()
			return
		}
		e.preventDefault()
		e.stopPropagation()

		if (this.dragging.row) {
			this.dragging.row.setFromClientX(e.clientX)
			return
		}

		this.x = e.clientX - this.moveOffset.x
		this.y = e.clientY - this.moveOffset.y
		this.conformPosition()
		this.drawPosition()
	}
	handlePointerUp = (e: PointerEvent) => {
		if (!this.dragging) return
		e.preventDefault()
		e.stopPropagation()
		this.endDrag()
	}
	/** Capture can be taken away by the browser, e.g. a native drag or a page alert. */
	handleLostCapture = () => this.endDrag()
	handleInterrupt = () => {
		this.endDrag()
		this.closeMenu()
	}
	handleKeyDown = (e: KeyboardEvent) => {
		if (e.key !== "Escape") return
		this.dragging ? this.cancelDrag() : this.closeMenu()
	}
	/** Put back what the drag was changing, then stop it. */
	cancelDrag = () => {
		if (!this.dragging) return
		const { row, startValue, startX, startY } = this.dragging
		this.endDrag(false)

		if (row) {
			startValue == null || row.setValue(startValue, true)
			return
		}
		this.x = startX
		this.y = startY
		this.drawPosition()
	}
	endDrag = (commit = true) => {
		if (!this.dragging) return
		const { row, pointerId } = this.dragging
		delete this.dragging
		try {
			this.panel.releasePointerCapture(pointerId)
		} catch (err) {}
		this.panel.classList.remove("moving")

		if (row) {
			commit && row.send(true)
			return
		}
		this.positioned = true
	}
}

/** A single keybind's slider within the panel. */
class ItcRow {
	el = document.createElement("div")
	header = document.createElement("div")
	titleDiv = document.createElement("div")
	valueButton = m(`<button class="value"></button>`) as HTMLButtonElement
	track = document.createElement("div")
	fill = document.createElement("div")
	thumb = document.createElement("div")
	grip = m(`<div class="grip">${gripIcon}</div>`) as HTMLElement
	menu = document.createElement("div")
	addButton = m(`<button class="add">${plusIcon}</button>`) as HTMLButtonElement
	resetButton = m(`<button class="reset">${resetIcon}</button>`) as HTMLButtonElement
	closeButton = m(`<button class="close">${crossIcon}</button>`) as HTMLButtonElement
	sliderMin: number
	sliderMax: number
	decimals: number
	value?: number
	lastSent = 0

	constructor(
		private panel: ItcPanel,
		public init: ItcInit,
	) {
		this.sliderMin = init.sliderMin ?? init.min ?? 0
		this.sliderMax = init.sliderMax ?? init.max ?? 1
		const span = Math.abs(this.sliderMax - this.sliderMin)
		this.decimals = span >= 100 ? 0 : span >= 10 ? 1 : 2

		this.el.className = "row"
		this.menu.className = "menu"
		this.header.className = "rowHeader"
		this.titleDiv.className = "title"
		this.track.className = "track"
		this.fill.className = "fill"
		this.thumb.className = "thumb"

		const rail = document.createElement("div")
		rail.className = "rail"

		this.titleDiv.textContent = init.label || ""
		this.valueButton.textContent = "--"
		this.init.resetTo == null && (this.resetButton.style.display = "none")

		this.header.append(this.grip, this.addButton, this.titleDiv, this.valueButton, this.resetButton, this.closeButton)
		this.track.append(rail, this.fill, this.thumb)
		this.el.append(this.header, this.track, this.menu)
		this.closeMenu()
		this.draw()

		this.track.addEventListener("pointerdown", this.handleValueDown)
		this.el.addEventListener("wheel", this.handleWheel, { passive: false })
		this.valueButton.addEventListener("click", this.handlePrompt)
		this.addButton.addEventListener("click", this.handleAdd)
		this.resetButton.addEventListener("click", this.handleReset)
		this.closeButton.addEventListener("click", this.handleClose)
	}
	/** Identifies what this row controls, so the panel can keep types unique. */
	get typeKey() {
		const kb = this.init.kb
		return kb.command === "fxFilter" ? this.filterTypeKey(kb.filterOption) : (kb.command as string)
	}
	filterTypeKey = (name: string) => `fxFilter:${this.init.kb.filterTarget || "element"}:${name}`
	/** Related types the panel isn't already showing. */
	openTypes = () => {
		const isFilter = this.init.kb.command === "fxFilter"
		return (this.init.related || []).filter((related) => !this.panel.hasType(isFilter ? this.filterTypeKey(related.key) : related.key))
	}
	syncAdd = () => {
		this.closeMenu()
		this.addButton.style.display = this.openTypes().length ? "flex" : "none"
	}
	closeMenu = () => {
		this.menu.replaceChildren()
		this.menu.style.display = "none"
	}
	openMenu = () => {
		this.panel.closeMenu()
		this.menu.replaceChildren(
			...this.openTypes().map((related) => {
				const item = m(`<button class="menuItem"></button>`) as HTMLButtonElement
				item.textContent = related.label
				item.addEventListener("click", () => this.panel.addRow(this, related.key))
				return item
			}),
		)
		this.menu.style.display = "block"
		this.panel.openMenuRow = this
		this.panel.handleResize()
	}
	release = () => {
		this.el.remove()
	}
	format = (value: number) => (value == null ? "--" : value.toFixed(this.decimals))
	handleView = (view: StateView) => {
		// Our own optimistic value wins while the user is dragging.
		if (this.panel.dragging?.row === this) return
		const values = getItcValues(this.init.kb, view, { default: this.init.resetTo })
		// A backdrop only filter shortcut should track the backdrop's value, not the element's.
		const useSecondary = this.init.kb.command === "fxFilter" && this.init.kb.filterTarget === "backdrop"
		const value = useSecondary ? (values.secondary ?? values.main) : (values.main ?? values.secondary)
		if (value == null) return
		this.value = round(value, this.decimals)
		this.draw()
	}
	draw = () => {
		const normal = this.value == null ? 0 : clamp(0, 1, inverseLerp(this.sliderMin, this.sliderMax, this.value))
		this.fill.style.width = `${normal * 100}%`
		this.thumb.style.left = `${normal * 100}%`
		this.valueButton.textContent = this.format(this.value)
	}
	setValue = (value: number, final?: boolean) => {
		value = round(clamp(this.init.min, this.init.max, value), this.decimals)
		if (value === this.value && !final) return
		this.value = value
		this.draw()
		this.send(final)
	}
	setFromClientX = (clientX: number, final?: boolean) => {
		const bounds = this.track.getBoundingClientRect()
		if (!bounds.width) return
		this.setValue(lerp(this.sliderMin, this.sliderMax, clamp(0, 1, (clientX - bounds.x) / bounds.width)), final)
	}
	send = (final?: boolean) => {
		if (this.value == null) return
		const now = Date.now()
		if (!final && now - this.lastSent < SEND_INTERVAL) return
		this.lastSent = now

		chrome.runtime.sendMessage({
			type: "SET_STATEFUL",
			init: {
				kb: this.init.kb,
				tabInfo: gvar.tabInfo,
				value: this.value,
				valueAlt: this.value,
			},
		} as Messages)
	}
	handleValueDown = (e: PointerEvent) => {
		if (e.button) return
		e.preventDefault()
		e.stopPropagation()
		this.panel.startValue(e, this)
	}
	handleWheel = (e: WheelEvent) => {
		if (this.value == null || (e.target as HTMLElement).closest?.(".menu")) return
		e.preventDefault()
		e.stopPropagation()
		const step = this.init.step || Math.abs(this.sliderMax - this.sliderMin) / 50
		this.setValue(this.value + (e.deltaY < 0 ? step : -step), true)
	}
	/** Typing a value covers what a slider can't: precision, and anything past its range. */
	handlePrompt = (e: MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		const { min, max, label } = this.init
		const range = min == null || max == null ? "" : ` (${min} - ${max})`
		const typed = window.prompt(`${label || ""}${range}`, this.format(this.value))
		if (typed == null) return

		const parsed = parseFloat(typed)
		// setValue clamps to the command's own min and max.
		isNaN(parsed) || this.setValue(parsed, true)
	}
	handleAdd = (e: MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		this.menu.style.display === "block" ? this.panel.closeMenu() : this.openMenu()
	}
	handleReset = (e: MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		this.init.resetTo != null && this.setValue(this.init.resetTo, true)
	}
	handleClose = (e: MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		this.panel.removeRow(this.init.kb.id)
	}
}

gvar.toggleItc = toggleItc
