import "./Toggle.css"

type ToggleProps = {
	value: boolean
	onChange: (newValue: boolean) => void
}

export function Toggle(props: ToggleProps) {
	return (
		<div
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
