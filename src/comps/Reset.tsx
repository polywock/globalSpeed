import { GiAnticlockwiseRotation } from "react-icons/gi"
import { Tooltip } from "./Tooltip"

type ResetProps = {
	onClick?: () => void
	active?: boolean
}

export function Reset(props: ResetProps) {
	return (
		<Tooltip title={gvar.gsm.token.reset}>
			<GiAnticlockwiseRotation
				size={"1.07rem"}
				className={`Reset ${props.active ? "active" : ""}`}
				onClick={() => props.active && props.onClick()}
			/>
		</Tooltip>
	)
}
