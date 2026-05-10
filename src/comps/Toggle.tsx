import "./Toggle.css"

type ToggleProps = {
	value: boolean
	onChange: (newValue: boolean) => void
	"aria-label"?: string
}

export function Toggle(props: ToggleProps) {
	return (
		<div
			role="switch"
			aria-checked={props.value}
			aria-label={props["aria-label"]}
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					props.onChange(!props.value)
				}
			}}
			onClick={(e) => {
				props.onChange(!props.value)
			}}
			className={`Toggle ${props.value ? "active" : ""}`}
		/>
	)
}
