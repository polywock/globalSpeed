import { gvar } from "@/globalVar"
import { cn } from "@/utils/helper"
import { Gear } from "./svgs"
import { Tooltip, TooltipProps } from "./Tooltip"

export function GearIcon(props: {
	tooltip?: string
	onClick: React.MouseEventHandler<HTMLButtonElement>
	align?: TooltipProps["align"]
	className?: string
}) {
	return (
		<Tooltip title={props.tooltip || gvar.gsm.token.customize} align={props.align || "top"}>
			<button aria-label={props.tooltip || gvar.gsm.token.customize} className={cn("icon-button", props.className)} onClick={props.onClick}>
				<Gear size="1.57rem" />
			</button>
		</Tooltip>
	)
}
