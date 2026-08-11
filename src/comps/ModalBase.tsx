import { ComponentPropsWithoutRef, ReactElement, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { cn, isMobile } from "@/utils/helper"

type Props = {
	children: ReactElement
	onClose: () => void
	keepOnWheel?: boolean
	className?: string
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
			ref={ref}
			onPointerDownCapture={(e) => {
				if (e.target === ref.current) {
					props.onClose()
				}
			}}
			className={cn(
				"ModalBase fixed top-0 left-0 z-[9999999999] grid h-screen w-screen items-center justify-center bg-black/45",
				props.className,
				isMobile() && "isMobile",
			)}
		>
			{props.children}
		</div>,
		document.body,
	)
}

export function ModalContent({ className, ...props }: ComponentPropsWithoutRef<"div">) {
	return (
		<div
			{...props}
			className={cn(
				"max-h-[90vh] w-[700px] max-w-[90vw] overflow-y-auto rounded-lg bg-card p-[20px] text-card-foreground",
				isMobile() && "max-h-[90%] max-w-[90%]",
				className,
			)}
		/>
	)
}
