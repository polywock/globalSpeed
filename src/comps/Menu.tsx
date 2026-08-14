import { FaCheck } from "react-icons/fa"
import { cn } from "@/utils/helper"
import { ModalBase } from "./ModalBase"
import { RegularTooltip } from "./RegularTooltip"
import { TooltipProps } from "./Tooltip"

export function makeMenuLabelWithTooltip(name: string, tooltip: string, align: TooltipProps["align"] = "right") {
	return (
		<>
			{name}
			<RegularTooltip className="ml-2.5 bg-background/15 border-background/20 text-inherit" offset={30} align={align} title={tooltip} />
		</>
	)
}

export type MenuProps = {
	position: { x?: number; y?: number; aligned?: boolean; centered?: boolean }
	onClose: () => void
	onSelect: (name: string) => void
	items: { name: string; checked?: boolean; close?: boolean; preLabel?: string; label?: string | React.ReactElement; className?: string }[]
	menuRef: React.Ref<HTMLDivElement>
}

export const Menu = (props: MenuProps) => {
	let centered = props.position.centered
	return (
		<ModalBase className="bg-transparent" onClose={props.onClose}>
			<div
				ref={props.menuRef}
				style={centered ? undefined : { left: `${props.position.x}px`, top: `${props.position.y}px` }}
				className={cn(
					"fixed z-menu rounded-lg border-2 border-border-x bg-popover text-popover-foreground select-none",
					centered && "top-[2em] max-w-[90vw] justify-self-center text-sm",
				)}
			>
				{props.items.map((v) => {
					const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
						props.onSelect(v.name)
						if (v.close) props.onClose()
					}

					return (
						<div
							key={v.name}
							onClick={handleClick}
							className={cn(
								"grid cursor-pointer grid-cols-[20px_auto] border-b border-border-x py-1.25 pr-5 pl-2.5 leading-[1.5] opacity-85 hover:opacity-100",
								v.className,
							)}
						>
							<span>{v.checked === true ? <FaCheck /> : <div>{v.preLabel ?? ""}</div>}</span>
							<span>{v.label ?? v.name}</span>
						</div>
					)
				})}
			</div>
		</ModalBase>
	)
}
