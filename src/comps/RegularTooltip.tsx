import { Tooltip, TooltipProps } from "./Tooltip"
import "./RegularTooltip.css"

export function RegularTooltip(props: {label?: string, offset?: number, title: string, align?: TooltipProps['align'], styles?: React.CSSProperties}) {
    return <Tooltip allowClick={true} title={props.title} align={props.align || 'top'} withClass="RegularTooltip" offset={props.offset}>
        <span style={props.styles}>{props.label || "?"}</span>
    </Tooltip>
    return 
}