import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { clamp, isMobile } from "@/utils/helper"
import "./Tooltip.css"

const EDGE_PADDING = 15
const DEFAULT_OFFSET = 8
const DEFAULT_TIMEOUT = 15_000

export type TooltipOpts = {
	label: string
	align: "top" | "bottom" | "left" | "right"
	anchor?: {
		elem: HTMLElement
	}
	fixed?: boolean
	position?: { x: number; y: number }
	offset?: number
	maxWidth?: number
	rawOffsetX?: number
	rawOffsetY?: number
}
export type TooltipAlign = TooltipOpts["align"]

type TooltipContextState = {
	showTooltip: (opts: TooltipOpts) => void
	clearTooltip: (anchor?: HTMLElement) => void
}

const TooltipContext = createContext(null as TooltipContextState | null)

export type TooltipAnchorOpts = Omit<TooltipOpts, "anchor" | "label"> & {
	label?: string
	allowClick?: boolean
	dontAllowFocus?: boolean
	closeOnPointerDown?: boolean
}

export function TooltipProvider(props: { children: React.ReactNode }) {
	const [tooltip, setTooltip] = useState(null as TooltipOpts | null)
	const activeAnchorRef = useRef(null as HTMLElement | null)
	const clearTooltip = useCallback((anchor?: HTMLElement) => {
		if (anchor && activeAnchorRef.current && activeAnchorRef.current !== anchor) return
		activeAnchorRef.current = null
		setTooltip(null)
	}, [])
	const showTooltip = useCallback((opts: TooltipOpts) => {
		activeAnchorRef.current = opts.anchor?.elem || null
		setTooltip(opts)
	}, [])
	const ctxValue = useMemo(() => ({ showTooltip, clearTooltip }), [showTooltip, clearTooltip])

	return (
		<TooltipContext.Provider value={ctxValue}>
			{props.children}
			{tooltip ? <TooltipPopover opts={tooltip} onClear={clearTooltip} /> : null}
		</TooltipContext.Provider>
	)
}

export function useTooltip() {
	const ctx = useContext(TooltipContext)
	if (!ctx) throw new Error("useTooltip must be used within TooltipProvider")
	return ctx
}

export function useTooltipAnchor<T extends HTMLElement = HTMLElement>(opts: TooltipAnchorOpts) {
	const { showTooltip, clearTooltip } = useTooltip()
	const ref = useRef<T>(null)
	const seenElemRef = useRef<T>(null)
	const [elemNonce, setElemNonce] = useState(0)

	useEffect(() => {
		if (seenElemRef.current === ref.current) return
		seenElemRef.current = ref.current
		setElemNonce((v) => v + 1)
	})

	useEffect(() => {
		const elem = ref.current
		if (!elem) return
		let isActive = false
		let suppressShow = false

		const show = () => {
			if (suppressShow) return
			if (!opts.label) return
			isActive = true
			showTooltip({
				label: opts.label,
				align: opts.align,
				anchor: { elem },
				fixed: opts.fixed,
				position: opts.position,
				offset: opts.offset,
				maxWidth: opts.maxWidth,
				rawOffsetX: opts.rawOffsetX,
				rawOffsetY: opts.rawOffsetY,
			})
		}
		const clear = () => {
			if (!isActive) return
			isActive = false
			clearTooltip(elem)
		}
		const clearAndSuppress = () => {
			clear()
			suppressShow = true
			requestAnimationFrame(() => {
				suppressShow = false
			})
		}
		const onMouseLeave = (e: MouseEvent) => {
			const relatedTarget = e.relatedTarget as Node | null
			if (relatedTarget && elem.contains(relatedTarget)) return
			if (!opts.dontAllowFocus && document.activeElement === elem) return
			clear()
		}
		const onFocusOut = (e: FocusEvent) => {
			const relatedTarget = e.relatedTarget as Node | null
			if (relatedTarget && elem.contains(relatedTarget)) return
			clear()
		}

		const controller = new AbortController()

		if (!isMobile()) {
			elem.addEventListener("mouseenter", show, { signal: controller.signal })
			elem.addEventListener("mouseleave", onMouseLeave, { signal: controller.signal })
			if (!opts.dontAllowFocus) {
				elem.addEventListener("focusin", show, { signal: controller.signal })
				elem.addEventListener("focusout", onFocusOut, { signal: controller.signal })
			}
		}

		if (opts.allowClick) {
			elem.addEventListener("click", show, { signal: controller.signal })
		}
		if (opts.closeOnPointerDown) {
			elem.addEventListener("pointerdown", clearAndSuppress, { signal: controller.signal, capture: true })
		}

		return () => {
			controller.abort()
			clear()
		}
	}, [
		clearTooltip,
		elemNonce,
		opts.align,
		opts.allowClick,
		opts.closeOnPointerDown,
		opts.dontAllowFocus,
		opts.fixed,
		opts.label,
		opts.maxWidth,
		opts.offset,
		opts.position,
		opts.rawOffsetX,
		opts.rawOffsetY,
		showTooltip,
	])

	return ref
}

export function TooltipPopover(props: { opts: TooltipOpts; onClear: (anchor?: HTMLElement) => void }) {
	const ref = useRef<HTMLSpanElement>(null)

	useLayoutEffect(() => {
		const tipElem = ref.current
		const anchorElem = props.opts.anchor?.elem
		if (!tipElem) return

		tipElem.showPopover()
		tipElem.style.inset = "auto"
		tipElem.style.margin = "0"

		let align = props.opts.align
		let offset = props.opts.offset ?? DEFAULT_OFFSET
		let maxWidth = props.opts.maxWidth ?? 400
		let x = props.opts.position?.x || 0
		let y = props.opts.position?.y || 0

		if (anchorElem) {
			const mainBounds = anchorElem.getBoundingClientRect()
			if (align === "right") {
				maxWidth = clamp(0, window.innerWidth - mainBounds.x - offset - 40, maxWidth)
			} else if (align === "left") {
				maxWidth = clamp(0, mainBounds.x - offset - 15, maxWidth)
			}
			maxWidth = clamp(0, window.innerWidth * 0.95, maxWidth)
			tipElem.style.maxWidth = `${maxWidth}px`
			let tipBounds = tipElem.getBoundingClientRect()

			// Swap directions if need be.
			const remainingTop = mainBounds.y - offset
			const remainingBottom = window.innerHeight - (mainBounds.y + mainBounds.height + offset)
			if (align === "top") {
				if (tipBounds.height > remainingTop && remainingBottom > remainingTop) {
					align = "bottom"
				}
			} else if (align === "bottom") {
				if (tipBounds.height > remainingBottom && remainingTop > remainingBottom) {
					align = "top"
				}
			}

			if (align === "top") {
				y = mainBounds.y - (tipBounds.height + offset)
				x = mainBounds.x + (mainBounds.width - tipBounds.width) * 0.5
			} else if (align === "bottom") {
				y = mainBounds.y + mainBounds.height + offset
				x = mainBounds.x + (mainBounds.width - tipBounds.width) * 0.5
			} else if (align === "left") {
				x = mainBounds.x - offset - tipBounds.width
				y = mainBounds.y + (mainBounds.height - tipBounds.height) * 0.5
			} else if (align === "right") {
				x = mainBounds.x + mainBounds.width + offset
				y = mainBounds.y + (mainBounds.height - tipBounds.height) * 0.5
			}

			const maxX = Math.max(EDGE_PADDING, window.innerWidth - tipBounds.width - EDGE_PADDING)
			const maxY = Math.max(EDGE_PADDING, window.innerHeight - tipBounds.height - EDGE_PADDING)
			x = clamp(EDGE_PADDING, maxX, x)
			y = clamp(EDGE_PADDING, maxY, y)
		}

		tipElem.style.left = `${x + (props.opts.rawOffsetX || 0)}px`
		tipElem.style.top = `${y + (props.opts.rawOffsetY || 0)}px`

		const signal = new AbortController()
		const clear = () => props.onClear()
		window.addEventListener("wheel", clear, { signal: signal.signal, once: true })
		document.addEventListener("scroll", clear, { signal: signal.signal, once: true, capture: true })
		window.addEventListener("resize", clear, { signal: signal.signal, once: true })
		document.addEventListener(
			"pointerdown",
			(e) => {
				const anchor = props.opts.anchor?.elem
				if (anchor && anchor.contains(e.target as Node)) return
				clear()
			},
			{ signal: signal.signal, once: true },
		)
		const timeoutId = window.setTimeout(clear, DEFAULT_TIMEOUT)

		return () => {
			clearTimeout(timeoutId)
			signal.abort()
			tipElem.hidePopover()
		}
	}, [props.opts, props.onClear])

	let style: React.CSSProperties = {
		position: props.opts.fixed === false ? "absolute" : "fixed",
		display: "block",
	}
	if (props.opts.position) {
		style.left = `${props.opts.position.x}px`
		style.top = `${props.opts.position.y}px`
	}

	return (
		<span ref={ref} popover="manual" style={style} className="TooltipTip">
			{props.opts.label}
		</span>
	)
}
