import { Gear } from "./svgs"
import { TooltipAlign, useTooltipAnchor } from "./Tooltip"


export function GearIcon(props: {
    tooltip?: string,
    onClick: React.MouseEventHandler<HTMLButtonElement>,
    align?: TooltipAlign
}) {
    const ref = useTooltipAnchor<HTMLButtonElement>({
        label: props.tooltip || gvar.gsm.token.customize,
        align: props.align || 'top'
    })
    return <button ref={ref} className="icon gear interactive" onClick={props.onClick}>
        <Gear size="1.57rem"/>
    </button>
}
