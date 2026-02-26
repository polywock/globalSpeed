import clsx from "clsx"
import { useRef, useState } from "react"
import { GoX } from "react-icons/go"
import { MoveDrag } from "@/comps/MoveDrag"
import { Tooltip } from "@/comps/Tooltip"
import "./ListItem.css"

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
			className={clsx("ListItem", {
				focus,
				spacing: props.spacing === 1,
				doubleSpacing: props.spacing === 2,
				disabled: !props.isEnabled,
			})}
		>
			{props.label && (
				<div className="ListItemLabel" onClick={props.onClearLabel}>
					<Tooltip title={gvar.gsm.token.delete}>
						<span>
							{props.label}
							<GoX />
						</span>
					</Tooltip>
				</div>
			)}
			<div className="ListItemCore">
				{/* Grippper */}
				<MoveDrag setFocus={(v) => setFocus(v)} itemRef={itemRef} listRef={props.listRef} onMove={props.onMove} />

				<div className="children">{props.children}</div>

				{/* Delete */}
				<Tooltip title={gvar.gsm.token.delete}>
					<button className="close icon" onClick={(e) => props.onRemove()}>
						<GoX size="1.6rem" />
					</button>
				</Tooltip>
			</div>
			<div className="ListItemSub"></div>
		</div>
	)
}
