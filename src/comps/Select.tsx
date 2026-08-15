import { ComponentProps } from "react"
import { cn } from "@/utils/helper"

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
	return (
		<select
			{...rest}
			className={cn("text-center", className)}
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
