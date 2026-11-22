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
					"rounded-lg border border-border bg-card px-1 text-card-foreground opacity-75 select-none hover:opacity-100",
					props.className,
				)}
				style={props.styles}
			>
				<span aria-hidden="true">{props.label || "?"}</span>
				{/* Hover-only help is otherwise invisible to screen readers. */}
				<span className="sr-only">{props.title}</span>
			</span>
		</Tooltip>
	)
}
