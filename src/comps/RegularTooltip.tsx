import { TooltipAlign, useTooltipAnchor } from "./Tooltip"
import "./RegularTooltip.css"

export function RegularTooltip(props: { label?: string; offset?: number; title: string; align?: TooltipAlign; styles?: React.CSSProperties }) {
	const ref = useTooltipAnchor<HTMLSpanElement>({
		label: props.title,
		align: props.align || "top",
		offset: props.offset,
		allowClick: true,
	})
	return (
		<span ref={ref} className="RegularTooltip" style={props.styles}>
			{props.label || "?"}
		</span>
	)
}
