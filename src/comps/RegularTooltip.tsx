import { cn } from "@/utils/helper"
import { Tooltip, TooltipProps } from "./Tooltip"

export function RegularTooltip(props: {
	label?: string
	offset?: number
	title: string
	align?: TooltipProps["align"]
	styles?: React.CSSProperties
	className?: string
}) {
	return (
		<Tooltip title={props.title} align={props.align || "top"} offset={props.offset} allowClick>
			<span
				className={cn(
					"cursor-pointer rounded-lg border border-border bg-card px-1 text-card-foreground opacity-75 select-none hover:opacity-100",
					props.className,
				)}
				style={props.styles}
			>
				{props.label || "?"}
			</span>
		</Tooltip>
	)
}
