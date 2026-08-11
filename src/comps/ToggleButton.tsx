import { type ComponentPropsWithRef } from "react"
import { cn } from "@/utils/helper"

type ToggleButtonProps = Omit<ComponentPropsWithRef<"button">, "aria-pressed"> & {
	active?: boolean
	colored?: boolean
}

/** A button whose active state can be toggled on and off. */
export function ToggleButton({ active = false, colored = false, className, ...props }: ToggleButtonProps) {
	return (
		<button
			{...props}
			aria-pressed={active}
			className={cn(
				"toggle rounded-[5px] text-foreground/50 opacity-70",
				active && "active enabled:border-border-xx enabled:text-foreground enabled:opacity-100",
				colored && "colored",
				active && colored && "enabled:border-ring enabled:text-ring",
				className,
			)}
		/>
	)
}
