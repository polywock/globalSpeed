import { useRef, useState } from "react"
import { GoX } from "react-icons/go"
import { MoveDrag } from "@/comps/MoveDrag"
import { Tooltip } from "@/comps/Tooltip"
import { Button } from "@/comps/ui/button"
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
			data-slot="list-item"
			className={cn(
				"relative mb-2.5 h-auto rounded-lg transition-[height] duration-100 ease-out last:mb-0 starting:h-0 dragging:transition-none last:[&>[data-slot=list-item-sub]]:border-transparent",
				props.spacing === 1 && "mb-6.25",
				props.spacing === 2 && "mb-10",
				!props.isEnabled && "opacity-[.66]",
				focus && "left-2.5 z-[2] shadow-[-4px_4px_4px_color-mix(in_oklab,black_40%,transparent)]",
			)}
		>
			{props.label && (
				<div data-slot="list-item-label" className="cursor-ns-resize select-none" onClick={props.onClearLabel}>
					<Tooltip title={gvar.gsm.token.delete}>
						<span className="inline-block cursor-auto rounded-sm border border-border bg-secondary px-2 py-1 text-md select-auto [&:hover>svg]:w-auto [&:hover>svg]:pl-1.25">
							{props.label}
							<GoX className="inline-block w-0 overflow-hidden align-middle text-2xl transition-[width,padding] duration-150 ease-out [interpolate-size:allow-keywords]" />
						</span>
					</Tooltip>
				</div>
			)}
			<div
				data-slot="list-item-core"
				className="relative grid cursor-auto grid-cols-[max-content_1fr_max-content] items-center gap-x-1.25 bg-background pt-2.5 select-auto"
			>
				{/* Grippper */}
				<MoveDrag setFocus={(v) => setFocus(v)} itemRef={itemRef} listRef={props.listRef} onMove={props.onMove} />

				<div className="children">{props.children}</div>

				{/* Delete */}
				<Tooltip title={gvar.gsm.token.delete}>
					<Button variant="icon" size="icon-auto" aria-label={gvar.gsm.token.delete} onClick={(e) => props.onRemove()}>
						<GoX size="1.6rem" />
					</Button>
				</Tooltip>
			</div>
			<div data-slot="list-item-sub" className="border-0 border-b border-border pb-3.75"></div>
		</div>
	)
}
