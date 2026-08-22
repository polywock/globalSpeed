import { type ComponentPropsWithRef } from "react"
import { cn } from "@/utils/helper"
import { Button } from "./ui/button"

type TabButtonProps = ComponentPropsWithRef<"button"> & {
	/** The currently selected tab. */
	open?: boolean
	/** The tab's contents deviate from their defaults. */
	active?: boolean
}

export function TabButton({ open = false, active = false, className, ...props }: TabButtonProps) {
	return (
		<Button
			{...props}
			size="control"
			role="tab"
			aria-selected={open}
			className={cn(
				"rounded-t-control rounded-b-none border-t-2 bg-secondary opacity-80 active:translate-y-0 aria-selected:border-b-transparent aria-selected:bg-background aria-selected:opacity-100",
				active && "border-t-primary",
				className,
			)}
		/>
	)
}
