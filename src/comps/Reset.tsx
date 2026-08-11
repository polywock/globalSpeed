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
					"Reset box-content rounded-[var(--radius)] border border-solid p-[2px] select-none",
					props.active ? "active visible border-tertiary text-tertiary" : "invisible border-secondary-foreground text-secondary-foreground",
					props.className,
				)}
				onClick={() => props.active && props.onClick()}
			/>
		</Tooltip>
	)
}
