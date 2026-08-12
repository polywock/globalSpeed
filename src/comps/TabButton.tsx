import { type ComponentPropsWithRef } from "react"
import { cn } from "@/utils/helper"

type TabButtonProps = ComponentPropsWithRef<"button"> & {
	/** The currently selected tab. */
	open?: boolean
	/** The tab's contents deviate from their defaults. */
	active?: boolean
}

export function TabButton({ open = false, active = false, className, ...props }: TabButtonProps) {
	return (
		<button
			{...props}
			role="tab"
			aria-selected={open}
			className={cn(
				"button-control rounded-t-control rounded-b-none border border-t-2 border-border-x bg-secondary opacity-80 focus:outline-1 focus:outline-ring aria-selected:border-b-transparent aria-selected:bg-background aria-selected:opacity-100",
				active && "border-t-tertiary",
				className,
			)}
		/>
	)
}
