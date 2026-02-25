import { cloneElement, useEffect, useRef } from "react"
import { clamp } from "@/utils/helper"
import "./Tooltip.css"

const DEFAULT_TIMEOUT = 15_000
const DEFAULT_OFFSET = 8
const DEFAULT_MAX_WIDTH = 400
const EDGE_PADDING = 15

type Env = {
	props?: TooltipProps
	activeAc?: AbortController
	timeoutId?: number
	wasClicked?: boolean
	redo?: () => void
	redoCount?: number
}

let latestCleanupFn: Function

export type TooltipProps = {
	children: React.ReactNode
	title?: string
	align?: "top" | "bottom" | "left" | "right"
	offset?: number
	maxWidth?: number
	withClass?: string
	rawOffsetX?: number
	rawOffsetY?: number
	allowClick?: boolean
	timeout?: ReturnType<typeof setTimeout>
	hmr?: boolean
	maxHmr?: number
}

let popup = document.createElement("div")
popup.classList.add("TooltipPopup")

export function Tooltip(props: TooltipProps) {
	const env = useRef({} as Env).current
	env.props = props

	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const main = ref.current
		if (!main) throw "Tooltip without reference"

		const ensureClean = () => {
			if (!env.activeAc) return
			clearTimeout(env.timeoutId)
			env.activeAc?.abort()
			delete env.activeAc
			delete env.redo
			popup.remove()
		}

		const ensureCleanForClick = (e: MouseEvent) => {
			if (!popup.contains(e.target as Element) && !main.contains(e.target as Element)) {
				ensureClean()
			}
		}

		const onPointerEnter = (e: PointerEvent) => {
			// Hover triggers require mouse
			const isHover = e.type !== "click"
			if (isHover && e.pointerType !== "mouse") return

			// Avoid repeated activation
			if (env.activeAc) {
				// Upgrade to wasClicked.
				if (!isHover && !env.wasClicked) {
					env.wasClicked = true
					window.addEventListener("pointerdown", ensureCleanForClick, { signal: env.activeAc.signal })
				}
				return
			}
			// Clear existing popups.
			latestCleanupFn?.()

			// Update env
			env.activeAc = new AbortController()
			env.redoCount = 0
			env.wasClicked = !isHover
			env.timeoutId = setTimeout(ensureClean, env.props.timeout || DEFAULT_TIMEOUT)
			latestCleanupFn = ensureClean

			// Add terminators
			window.addEventListener("wheel", ensureClean, { signal: env.activeAc.signal, once: true })
			window.addEventListener("scroll", ensureClean, { signal: env.activeAc.signal, once: true })
			window.addEventListener("resize", ensureClean, { signal: env.activeAc.signal, once: true })
			env.wasClicked && window.addEventListener("pointerdown", ensureCleanForClick, { signal: env.activeAc.signal })

			// Set popup
			popup.innerText = env.props.title
			positionAndPresentPopup(env.props, main.getBoundingClientRect())

			// For HMR
			env.redo = () => {
				popup.innerText = env.props.title
				positionAndPresentPopup(env.props, main.getBoundingClientRect())
				env.redoCount = (env.redoCount || 0) + 1

				// Push timeout
				clearTimeout(env.timeoutId)
				env.timeoutId = setTimeout(ensureClean, env.props.timeout || DEFAULT_TIMEOUT)
			}
		}

		const onPointerLeave = (e: PointerEvent) => {
			if (!env.activeAc || env.wasClicked) return
			if (e.relatedTarget instanceof Node && main.contains(e.relatedTarget)) return
			ensureClean()
		}

		const ac = new AbortController()
		main.addEventListener("pointerenter", onPointerEnter, { capture: true, signal: ac.signal })
		main.addEventListener("pointerleave", onPointerLeave as any, { capture: true, signal: ac.signal })
		env.props.allowClick && main.addEventListener("click", onPointerEnter, { capture: true, signal: ac.signal })

		return () => {
			ensureClean()
			ac.abort()
		}
	}, [props.allowClick])

	// Apply HMR
	useEffect(() => {
		if (!env.activeAc) return
		if (env.props.hmr !== false && (!env.props.maxHmr || env.props.maxHmr > (env.redoCount || 0))) {
			env.redo?.()
		} else {
			latestCleanupFn?.()
		}
	}, [props.title])

	return cloneElement(props.children as React.ReactElement<any>, { ref })
}

function positionAndPresentPopup(props: TooltipProps, mainBounds: DOMRect) {
	let align = props.align || "top"
	let offset = props.offset ?? DEFAULT_OFFSET
	let maxWidth = props.maxWidth ?? DEFAULT_MAX_WIDTH
	let x = 0
	let y = 0

	if (align === "right") {
		maxWidth = clamp(0, window.innerWidth - mainBounds.x - offset - 40, maxWidth)
	} else if (align === "left") {
		maxWidth = clamp(0, mainBounds.x - offset - 15, maxWidth)
	}
	maxWidth = clamp(0, window.innerWidth * 0.95, maxWidth)
	document.body.appendChild(popup)
	popup.style.maxWidth = `${maxWidth}px`
	popup.style.left = "0px"
	popup.style.top = "0px"
	popup.style.transform = "translate(-9999px, -9999px)"
	let popupBounds = popup.getBoundingClientRect()

	// Keep hidden if empty text.
	if (popup.textContent.trim()) {
		popup.style.transform = ""
	}

	// Swap directions if need be.
	const remainingTop = mainBounds.y - offset
	const remainingBottom = window.innerHeight - (mainBounds.y + mainBounds.height + offset)
	if (align === "top") {
		if (popupBounds.height > remainingTop && remainingBottom > remainingTop) {
			align = "bottom"
		}
	} else if (align === "bottom") {
		if (popupBounds.height > remainingBottom && remainingTop > remainingBottom) {
			align = "top"
		}
	}

	if (align === "top") {
		y = mainBounds.y - (popupBounds.height + offset)
		x = mainBounds.x + (mainBounds.width - popupBounds.width) * 0.5
	} else if (align === "bottom") {
		y = mainBounds.y + mainBounds.height + offset
		x = mainBounds.x + (mainBounds.width - popupBounds.width) * 0.5
	} else if (align === "left") {
		x = mainBounds.x - offset - popupBounds.width
		y = mainBounds.y + (mainBounds.height - popupBounds.height) * 0.5
	} else if (align === "right") {
		x = mainBounds.x + mainBounds.width + offset
		y = mainBounds.y + (mainBounds.height - popupBounds.height) * 0.5
	}

	const maxX = Math.max(EDGE_PADDING, window.innerWidth - popupBounds.width - EDGE_PADDING)
	const maxY = Math.max(EDGE_PADDING, window.innerHeight - popupBounds.height - EDGE_PADDING)
	x = clamp(EDGE_PADDING, maxX, x)
	y = clamp(EDGE_PADDING, maxY, y)

	popup.style.left = `${x + (props.rawOffsetX || 0)}px`
	popup.style.top = `${y + (props.rawOffsetY || 0)}px`
}
