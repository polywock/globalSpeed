import { ReactElement, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { isMobile } from "@/utils/helper"
import "./ModalBase.css"

type Props = {
	children: ReactElement
	onClose: () => void
	color?: string
	keepOnWheel?: boolean
	passClass?: string
}

export function ModalBase(props: Props) {
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (props.keepOnWheel) return

		const handleScroll = (e: Event) => {
			props.onClose()
		}

		document.addEventListener("wheel", handleScroll, { passive: true, capture: true })
		return () => {
			document.removeEventListener("wheel", handleScroll, true)
		}
	}, [props.keepOnWheel])

	useEffect(() => {
		if (!window.visualViewport || !isMobile()) return
		const vv = window.visualViewport

		const update = () => {
			if (!ref.current) return
			ref.current.style.width = `${vv.width}px`
			ref.current.style.height = `${vv.height}px`
			ref.current.style.left = `${vv.offsetLeft}px`
			ref.current.style.top = `${vv.offsetTop}px`
		}

		update()

		vv.addEventListener("resize", update)
		vv.addEventListener("scroll", update)
		return () => {
			vv.removeEventListener("resize", update)
			vv.removeEventListener("scroll", update)
		}
	}, [])

	return createPortal(
		<div
			{...(props.color ? { style: { backgroundColor: props.color } } : {})}
			ref={ref}
			onPointerDownCapture={(e) => {
				if (e.target === ref.current) {
					props.onClose()
				}
			}}
			className={`ModalBase ${props.passClass || ""} ${isMobile() ? "isMobile" : ""}`}
		>
			{props.children}
		</div>,
		document.body,
	)
}
