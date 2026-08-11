import { useRef, useState } from "react"
import { GoX } from "react-icons/go"
import { MoveDrag } from "@/comps/MoveDrag"
import { Tooltip } from "@/comps/Tooltip"
import { gvar } from "@/globalVar"
import { cn } from "@/utils/helper"

type ListItemProps = {
	children?: React.ReactNode
	listRef: React.RefObject<HTMLElement>
	spacing: number
	label: string
	onMove: (newIndex: number) => void
	onRemove: () => void
	onClearLabel: () => void
	isEnabled: boolean
}

export function ListItem(props: ListItemProps) {
	const itemRef = useRef<HTMLDivElement>(null)
	const [focus, setFocus] = useState(false)

	return (
		<div
			ref={itemRef}
			className={cn(
				"ListItem relative mb-[10px] h-auto rounded-[var(--radius)] transition-[height] duration-100 ease-out last:mb-0 starting:h-0 last:[&>.ListItemSub]:border-transparent [.dragging_&]:transition-none",
				props.spacing === 1 && "mb-[25px]",
				props.spacing === 2 && "mb-[40px]",
				!props.isEnabled && "opacity-[.66]",
				focus && "left-[10px] z-[2] shadow-[-4px_4px_4px_color-mix(in_oklab,black_40%,transparent)]",
			)}
		>
			{props.label && (
				<div className="ListItemLabel cursor-ns-resize select-none" onClick={props.onClearLabel}>
					<Tooltip title={gvar.gsm.token.delete}>
						<span className="inline-block cursor-auto rounded-[var(--radius-sm)] border border-solid border-border-x bg-secondary px-[8px] py-[4px] text-[0.95em] select-auto [&:hover>svg]:w-auto [&:hover>svg]:pl-[5px]">
							{props.label}
							<GoX className="inline-block w-0 overflow-hidden align-middle text-[1.3em] transition-[width,padding] duration-150 ease-out [interpolate-size:allow-keywords]" />
						</span>
					</Tooltip>
				</div>
			)}
			<div className="ListItemCore relative grid cursor-auto grid-cols-[max-content_1fr_max-content] items-center gap-x-[5px] bg-background pt-[10px] select-auto">
				{/* Grippper */}
				<MoveDrag setFocus={(v) => setFocus(v)} itemRef={itemRef} listRef={props.listRef} onMove={props.onMove} />

				<div className="children">{props.children}</div>

				{/* Delete */}
				<Tooltip title={gvar.gsm.token.delete}>
					<button aria-label={gvar.gsm.token.delete} className="icon" onClick={(e) => props.onRemove()}>
						<GoX size="1.6rem" />
					</button>
				</Tooltip>
			</div>
			<div className="ListItemSub border-0 border-b border-solid border-border-x pb-[15px]"></div>
		</div>
	)
}
