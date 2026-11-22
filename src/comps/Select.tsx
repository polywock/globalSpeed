import { ComponentProps } from "react"
import { useFieldLabelProps } from "./FieldLabel"

export type SelectOption = {
	key: string
	value: string
	title?: string
	disabled?: boolean
}

export function Select({
	options,
	value,
	onChanged,
	className,
	...rest
}: {
	options: SelectOption[]
	value: string
	onChanged: (newValue: string) => void
} & Omit<ComponentProps<"select">, "value" | "onChange" | "children">) {
	const labelProps = useFieldLabelProps(rest)
	return (
		<select
			{...labelProps}
			{...rest}
			className={className}
			value={value}
			onChange={(e) => {
				onChanged(e.target.value)
			}}
		>
			{options.map((option) => (
				<option key={option.key} value={option.key} title={option.title} disabled={option.disabled}>
					{option.value}
				</option>
			))}
		</select>
	)
}
