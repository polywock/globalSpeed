import { useFieldLabelProps } from "./FieldLabel"

type ToggleProps = {
	value: boolean
	onChange: (newValue: boolean) => void
	"aria-label"?: string
}

export function Toggle(props: ToggleProps) {
	const labelProps = useFieldLabelProps(props)
	return (
		<div
			role="switch"
			aria-checked={props.value}
			aria-label={props["aria-label"]}
			{...labelProps}
			tabIndex={0}
			onKeyDown={(e) => {
				// Space is the standard key for switches; Enter kept for existing users.
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault()
					props.onChange(!props.value)
				}
			}}
			onClick={(e) => {
				props.onChange(!props.value)
			}}
			className="inline-block w-10 cursor-pointer rounded-lg border-[1.5px] border-input bg-input leading-0 select-none after:pointer-events-none after:box-border after:inline-block after:h-4 after:w-4.5 after:translate-x-0 after:rounded-[inherit] after:border after:border-input after:bg-background after:transition-transform after:duration-[50ms] after:ease-linear after:content-[''] aria-checked:bg-primary aria-checked:after:translate-x-5"
		/>
	)
}
