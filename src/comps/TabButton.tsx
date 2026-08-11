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
			className={cn(
				"rounded-t-[5px] rounded-b-none border border-t-2 border-solid border-border-x bg-secondary opacity-80 focus:outline-1 focus:outline-ring",
				open && "border-b-transparent bg-background opacity-100",
				active && "border-t-tertiary",
				className,
			)}
		/>
	)
}
