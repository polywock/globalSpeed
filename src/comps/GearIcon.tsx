import { gvar } from "@/globalVar"
import { Gear } from "./svgs"
import { Tooltip, TooltipProps } from "./Tooltip"
import { Button } from "./ui/button"

export function GearIcon(props: {
	tooltip?: string
	onClick: React.MouseEventHandler<HTMLButtonElement>
	align?: TooltipProps["align"]
	className?: string
}) {
	return (
		<Tooltip title={props.tooltip || gvar.gsm.token.customize} align={props.align || "top"}>
			<Button
				variant="icon"
				size="icon-auto"
				aria-label={props.tooltip || gvar.gsm.token.customize}
				className={props.className}
				onClick={props.onClick}
			>
				<Gear size="1.57rem" />
			</Button>
		</Tooltip>
	)
}
