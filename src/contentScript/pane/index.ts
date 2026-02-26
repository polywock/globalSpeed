import { cellIcon, cloneIcon, crossIcon, paintRollerIcon } from "@/defaults/icons"
import { FilterEntry, SvgFilter } from "@/types"
import { formatFilters } from "@/utils/configUtils"
import { createElement as m } from "@/utils/helper"
import { calculateStyle } from "../isolated/FxSync"
import { ScalableDiv } from "./ScalableDiv"
import styles from "./styles.css?raw"

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
	constructor(
		private filters: FilterEntry[],
		private svgFilters: SvgFilter[],
		isClone = false,
	) {
		this.styleInfo = calculateStyle(true, "v", formatFilters(filters || []), "", "center", svgFilters || [])
		if (this.styleInfo.svg) {
			this.div.appendChild(this.styleInfo.svg)
		}

		this.innerDiv.classList.add("inner")
		this.div.appendChild(this.innerDiv)
		this.div.classList.add("pane")
		Pane.addPane(this)
		Pane.shadowRoot?.append(this.div)
		this.div.tabIndex = 0

		this.div.addEventListener(
			"contextmenu",
			(e) => {
				e.preventDefault()
				e.stopImmediatePropagation()
				this.release()
			},
			{ once: true },
		)

		const icons = createPaneIcons()
		const menu = document.createElement("div")
		this.div.appendChild(menu)

		menu.classList.add("menu")

		menu.appendChild(icons.clone)
		menu.appendChild(icons.paintRoller)
		menu.appendChild(icons.borderAll)
		menu.appendChild(icons.times)

		icons.clone.addEventListener("click", (e) => {
			const newPane = Pane.clone(this)
			newPane.div.focus()
		})

		icons.paintRoller.querySelector("#colorInput").addEventListener("input", (e) => {
			this.color = (e.target as HTMLInputElement).value
			this.sync()
		})

		icons.paintRoller.addEventListener("click", (e) => {
			if (this.color) {
				delete this.color
				this.sync()
				e.preventDefault()
			}
		})

		icons.borderAll.addEventListener("click", (e) => {
			this.hasBorder = !this.hasBorder
			this.sync()
		})

		icons.times.addEventListener("click", (e) => {
			this.release()
		})

		this.sync()
	}
	release = () => {
		delete this.div
		this.sDiv?.release()
		delete this.sDiv
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
			this.innerDiv.style.backgroundColor = this.color
			;(this.innerDiv.style as any).backdropFilter = "none"
		} else {
			;(this.innerDiv.style as any).backdropFilter = this.styleInfo.filterValue || ""
			this.innerDiv.style.backgroundColor = "transparent"
		}
	}
	static panes: Set<Pane> = new Set()
	static shadowRoot: ShadowRoot
	static addPane = (pane: Pane) => {
		Pane.panes.add(pane)
		if (Pane.panes.size && !Pane.shadowRoot) {
			Pane.shadowRoot = document.createElement("div").attachShadow({ mode: "closed" })
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
		clone: m(cloneIcon) as SVGElement,
		times: m(crossIcon) as SVGElement,
		paintRoller: m(`<label for="colorInput">
      ${paintRollerIcon}
      <input type="color" id="colorInput">
    </label>`) as HTMLLabelElement,
		borderAll: m(cellIcon) as SVGElement,
	}
}
