import { INDICATOR_INIT } from "@/defaults"
import { createOverlayIcons } from "@/defaults/icons"
import { IndicatorInit } from "@/types"
import { insertStyle } from "@/utils/nativeUtils"
import styles from "./Indicator.css?raw"
import { Popover } from "./Popover"

const BASE_FONT_SIZE = 30
const BASE_PADDING = 10
const BASE_BORDER_RADIUS = 10
const SMALL_SCALING = 0.83
const BASE_OFFSET = 30

export class Indicator extends Popover {
	main = document.createElement("div")
	icons = createOverlayIcons()
	scaling = 1
	duration = 1
	animation = 1
	timeoutId: number
	key: string

	constructor() {
		super()
		this._div.append(this.main)
		insertStyle(styles, this._shadow)
	}
	setInit = (init: IndicatorInit) => {
		init = init || {}
		this.key = init.key

		this.main.removeAttribute("style")
		this.main.style.backgroundColor = init.backgroundColor || INDICATOR_INIT.backgroundColor
		this.main.style.color = init.textColor || INDICATOR_INIT.textColor
		if (init.showShadow) this.main.style.boxShadow = `1px 1px 35px 3px #ffffff88`

		this.animation = init.animation || 1
		this.duration = init.duration ?? 1
		this.scaling = init.scaling ?? INDICATOR_INIT.scaling
		const rounding = (init.rounding ?? INDICATOR_INIT.rounding) * this.scaling

		this.main.style.padding = `${BASE_PADDING * (this.scaling + rounding * 0.12)}px`
		this.main.style.fontSize = `${BASE_FONT_SIZE * this.scaling}px`
		this.main.style.borderRadius = rounding ? `${BASE_BORDER_RADIUS * rounding}px` : "0px"

		const position = init.position ?? "TL"
		if (position === "C") {
			this.main.style.position = "revert"
			return
		} else {
			this.main.style.position = "fixed"
		}

		let offset = BASE_OFFSET * (init.offset ?? 1)
		const isTop = position.includes("T")
		const isLeft = position.includes("L")

		this.main.style[isTop ? "top" : "bottom"] = `${offset}px`
		this.main.style[isLeft ? "left" : "right"] = `${offset}px`
	}
	release = () => {
		delete this.icons
		clearTimeout(this.timeoutId)
		this._release()
	}
	show = (opts: IndicatorShowOpts) => {
		clearTimeout(this.timeoutId)
		this.main.innerText = opts.preText || ""
		;(opts.icons || []).forEach((v) => {
			this.main.appendChild(this.icons[v])
		})
		this.main.append(opts.text || "")

		const duration = (opts.duration ?? 900) * this.duration

		let size = `${(opts.small ? BASE_FONT_SIZE * SMALL_SCALING : BASE_FONT_SIZE) * this.scaling}px`
		let animation = ""
		if (!(opts.static || this.animation === 2)) {
			animation = `keyframe_${this.animation} ${duration}ms ease-in forwards`
		}
		this.main.style.animation = animation

		this.main.style.fontSize = opts.fontSize ?? size
		this._wrapper.remove()
		this._update(true)

		this.timeoutId = setTimeout(() => {
			this._update(false)
			delete this.timeoutId
		}, duration * 1.2)
	}
}

export type IndicatorShowOpts = {
	preText?: string
	text?: string
	duration?: number
	small?: boolean
	icons?: (keyof ReturnType<typeof createOverlayIcons>)[]
	static?: boolean
	fontSize?: string
}
