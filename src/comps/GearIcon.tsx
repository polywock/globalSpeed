import { Gear } from "./svgs"
import { Tooltip, TooltipProps } from "./Tooltip"


export function GearIcon(props: {
    tooltip?: string,
    onClick: React.MouseEventHandler<HTMLButtonElement>,
    align?: TooltipProps['align']
}) {
    return <Tooltip title={props.tooltip || gvar.gsm.token.customize} align={props.align || 'top'}>
        <button className="icon gear interactive" onClick={props.onClick}>
            <Gear size="1.57rem"/>
        </button>
    </Tooltip>
}