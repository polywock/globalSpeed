import { useEffect } from "react"
import { createPortal } from "react-dom"
import { ReactElement, useRef } from "react"
import "./ModalBase.css"

type Props = {
	children: ReactElement
	onClose: () => void
	color?: string
	keepOnWheel?: boolean
	passThrough?: boolean
	passClass?: string
}

export function ModalBase(props: Props) {
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (props.keepOnWheel || props.passThrough) {
			return
		}

		const handleScroll = (e: Event) => {
			props.onClose()
		}

		document.addEventListener("wheel", handleScroll, { passive: true, capture: true })
		return () => {
			document.removeEventListener("wheel", handleScroll, true)
		}
	}, [props.keepOnWheel, props.passThrough])

	return createPortal(
		<div
			{...(props.color ? { style: { backgroundColor: props.color } } : {})}
			ref={ref}
			onPointerDownCapture={(e) => {
				if (e.target === ref.current) {
					props.onClose()
				}
			}}
			className={`ModalBase ${props.passThrough ? "passThrough" : ""} ${props.passClass || ""}`}
		>
			{props.children}
		</div>,
		document.body,
	)
}
