import { GiAnticlockwiseRotation } from "react-icons/gi"
import { gvar } from "@/globalVar"
import { cn } from "@/utils/helper"
import { Tooltip } from "./Tooltip"

type ResetProps = {
	onClick?: () => void
	active?: boolean
	className?: string
}

export function Reset(props: ResetProps) {
	return (
		<Tooltip title={gvar.gsm.token.reset}>
			<GiAnticlockwiseRotation
				size={"1.07rem"}
				className={cn(
					"box-content rounded-lg border p-0.5 select-none",
					props.active ? "visible border-primary text-primary" : "invisible border-secondary-foreground text-secondary-foreground",
					props.className,
				)}
				role="button"
				aria-label={gvar.gsm.token.reset}
				tabIndex={props.active ? 0 : -1}
				onClick={() => props.active && props.onClick()}
				onKeyDown={(e) => {
					if (props.active && (e.key === "Enter" || e.key === " ")) {
						e.preventDefault()
						props.onClick()
					}
				}}
			/>
		</Tooltip>
	)
}
