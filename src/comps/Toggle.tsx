import { cn } from "@/utils/helper"

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
			className={cn(
				"Toggle inline-block w-[40px] cursor-pointer rounded-[var(--radius)] border-[1.5px] border-solid border-input leading-[0] select-none after:pointer-events-none after:box-border after:inline-block after:h-[14px] after:w-[18px] after:rounded-[inherit] after:border after:border-solid after:border-input after:bg-background after:transition-transform after:duration-[50ms] after:ease-linear after:content-['']",
				props.value ? "active bg-tertiary after:translate-x-[20px]" : "bg-input after:translate-x-0",
			)}
		/>
	)
}
