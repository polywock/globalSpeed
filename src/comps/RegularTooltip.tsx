import { NewTooltip, NewTooltipProps } from "./NewTooltip"
import "./RegularTooltip.css"

export function RegularTooltip(props: {label?: string, offset?: number, title: string, align?: NewTooltipProps['align'], styles?: React.CSSProperties}) {
    return <NewTooltip allowClick={true} title={props.title} align={props.align || 'top'} withClass="RegularTooltip" offset={props.offset}>
        <span style={props.styles}>{props.label || "?"}</span>
    </NewTooltip>
    return 
}