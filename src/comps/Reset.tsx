import { GiAnticlockwiseRotation } from "react-icons/gi"

type ResetProps = {
	onClick?: () => void
	active?: boolean
}

export function Reset(props: ResetProps) {
	return (
		<GiAnticlockwiseRotation size={"1.07rem"} className={`Reset ${props.active ? "active" : ""}`} onClick={() => props.active && props.onClick()} />
	)
}
