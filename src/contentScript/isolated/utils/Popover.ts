import { getLeaf, insertStyle } from "@/utils/nativeUtils"
import styles from "./Popover.css?raw"

export class Popover {
	_jump: JumpDiv
	_wrapper: HTMLDivElement
	_shadow: ShadowRoot
	_div = document.createElement("div")
	_supportsPopover = !!this._div.togglePopover
	_shouldShow = false
	_style?: HTMLStyleElement
	constructor() {
		if (!this._supportsPopover) {
			this._jump = new JumpDiv()
			this._wrapper = this._jump.div
			this._div.classList.add("popoverYah")
		}
		this._wrapper = this._wrapper || document.createElement("div")
		this._shadow = this._wrapper.attachShadow({ mode: "closed" })
		this._shadow.appendChild(this._div)

		this._div.popover = "manual"
		this._div.style.zIndex = "99999999999"
		gvar.os?.eListen.fsCbs.add(this._handleFsChange)

		if (!this._supportsPopover) {
			this._style = insertStyle(styles, this._shadow)
		}
	}
	_update = (show?: boolean) => {
		if (show != null) this._shouldShow = show
		if (this._shouldShow) {
			this._jump ? this._jump.connect() : document.documentElement.appendChild(this._wrapper)
			if (this._supportsPopover) {
				!this._div.togglePopover() && this._div.togglePopover()
			} else {
				this._div.classList.add("popoverOpenYah")
			}
		} else {
			this._wrapper.isConnected && this._wrapper.remove()
			this._div.classList.remove("popoverOpenYah")
		}
	}
	_release = () => {
		gvar.os?.eListen.fsCbs.delete(this._handleFsChange)
		this._wrapper.remove()
		this._jump?.release()
		delete this._jump
		delete this._div
	}
	_handleFsChange = () => {
		document.fullscreenElement && this._update()
	}
}

class JumpDiv {
	base: Element = document.documentElement
	div = document.createElement("div")
	released = false
	constructor() {
		// Might run in Options page so might not exist.
		gvar.os?.eListen.fsCbs.add(this.handleFullscreenChange)
	}
	release = () => {
		if (this.released) return
		this.released = true
		this.div.remove()

		gvar.os?.eListen.fsCbs.delete(this.handleFullscreenChange)
	}
	handleFullscreenChange = () => {
		let target = document.documentElement as Element

		let fs = getLeaf(document, "fullscreenElement")
		if (fs && fs.tagName !== "IFRAME") {
			target = fs
		}

		if (this.base !== target) {
			this.base = target
			if (this.div.isConnected) this.connect()
		}
	}
	connect = () => {
		if (this.div.parentElement === this.base) return
		this.base.appendChild(this.div)
	}
	disconnect = () => {
		this.div.isConnected && this.div.remove()
	}
}
