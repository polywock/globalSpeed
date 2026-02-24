import { Tooltip, TooltipProps } from "./Tooltip"
import "./RegularTooltip.css"

export function RegularTooltip(props: {
	label?: string
	offset?: number
	title: string
	align?: TooltipProps["align"]
	styles?: React.CSSProperties
}) {
	return (
		<Tooltip title={props.title} align={props.align || "top"} offset={props.offset} allowClick>
			<span className="RegularTooltip" style={props.styles}>
				{props.label || "?"}
			</span>
		</Tooltip>
	)
}
