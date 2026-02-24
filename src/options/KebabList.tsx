import { useEffect, useRef, useState } from "react"
import { IoEllipsisVertical } from "react-icons/io5"
import { Menu, type MenuProps } from "@/comps/Menu"
import { Tooltip, TooltipProps } from "@/comps/Tooltip"

export type KebabListProps = {
	list: MenuProps["items"]
	onSelect: (name: string) => boolean | void
	divIfEmpty?: boolean
	title?: string
	centered?: boolean
	onOpen?: () => void
	tooltipAlign?: TooltipProps["align"]
}

export function KebabList(props: KebabListProps) {
	const [menu, setMenu] = useState(null as { x?: number; y?: number; adjusted?: boolean; centered?: boolean })
	const menuRef = useRef<HTMLDivElement>(null)
	const buttonRef = useRef<HTMLDivElement>(null)

	const onContext = (e: React.MouseEvent) => {
		e.preventDefault()
		props.onOpen?.()
		if (props.centered) {
			setMenu({ centered: true })
			return
		}
		setMenu({ x: e.clientX, y: e.clientY })
	}

	useEffect(() => {
		if (!menu || menu.adjusted || menu.centered) return

		const bounds = menuRef.current.getBoundingClientRect()
		const buttonBounds = buttonRef.current.getBoundingClientRect()
		let x = menu.x
		let y = menu.y

		if (bounds.x + bounds.width > window.innerWidth - 15) {
			x = buttonBounds.x - 10 - bounds.width
		}
		if (bounds.y + bounds.height > window.innerHeight) {
			y = buttonBounds.y - 10 - bounds.height
		}
		setMenu({ x, y, adjusted: true })
	}, [menu])

	return (
		<>
			{props.title}
			<Tooltip title={props.title || gvar.gsm.token.more} align={props.tooltipAlign || "top"}>
				{/* First child of Tooltip must not have a ref. */}
				<button className="icon kebabTooltip" onClick={onContext}>
					<div ref={buttonRef}>
						<IoEllipsisVertical style={{ pointerEvents: "none" }} size="1.3em" />
					</div>
				</button>
			</Tooltip>
			{!menu ? (
				props.divIfEmpty ? (
					<div />
				) : null
			) : (
				<Menu menuRef={menuRef} items={[...(props.list || [])]} position={menu} onClose={() => setMenu(null)} onSelect={props.onSelect} />
			)}
		</>
	)
}
