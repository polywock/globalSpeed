import { type ComponentPropsWithRef } from "react"
import { cn } from "@/utils/helper"
import { Button } from "./ui/button"

type ToggleButtonProps = Omit<ComponentPropsWithRef<"button">, "aria-pressed"> & {
	active?: boolean
	activeAppearance?: boolean
	tone?: "accent" | "success" | "destructive"
}

/** A button whose active state can be toggled on and off. */
export function ToggleButton({ active = false, activeAppearance = true, tone, className, ...props }: ToggleButtonProps) {
	return (
		<Button
			{...props}
			size="control"
			aria-pressed={active}
			className={cn(
				"text-foreground/50 opacity-70",
				activeAppearance && "aria-pressed:enabled:border-border-strong aria-pressed:enabled:text-foreground aria-pressed:enabled:opacity-100",
				tone === "accent" && "aria-pressed:enabled:border-primary aria-pressed:enabled:text-primary",
				tone === "success" && "aria-pressed:border-success aria-pressed:bg-success/20 aria-pressed:text-success",
				tone === "destructive" && "aria-pressed:border-destructive aria-pressed:bg-destructive/12 aria-pressed:text-destructive",
				className,
			)}
		/>
	)
}
