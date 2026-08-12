import { type ComponentPropsWithRef } from "react"
import { cn } from "@/utils/helper"

type ToggleButtonProps = Omit<ComponentPropsWithRef<"button">, "aria-pressed"> & {
	active?: boolean
	activeAppearance?: boolean
	tone?: "accent" | "success" | "destructive"
}

/** A button whose active state can be toggled on and off. */
export function ToggleButton({ active = false, activeAppearance = true, tone, className, ...props }: ToggleButtonProps) {
	return (
		<button
			{...props}
			aria-pressed={active}
			className={cn(
				"button-control rounded-control text-foreground/50 opacity-70",
				activeAppearance && "aria-pressed:enabled:border-border-xx aria-pressed:enabled:text-foreground aria-pressed:enabled:opacity-100",
				tone === "accent" && "aria-pressed:enabled:border-ring aria-pressed:enabled:text-ring",
				tone === "success" && "aria-pressed:border-success aria-pressed:bg-success/20 aria-pressed:text-success",
				tone === "destructive" && "aria-pressed:border-destructive aria-pressed:bg-destructive-bg aria-pressed:text-destructive",
				className,
			)}
		/>
	)
}
