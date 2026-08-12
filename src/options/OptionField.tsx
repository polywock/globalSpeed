import { ComponentPropsWithoutRef } from "react"
import { cn } from "@/utils/helper"

export function OptionField({ className, ...props }: ComponentPropsWithoutRef<"div">) {
	return (
		<div
			{...props}
			className={cn(
				"mb-3.5 grid grid-cols-[var(--field-name-width,300px)_max-content] items-center gap-x-2.5 [&>[data-slot=slider-micro]]:grid-cols-[120px_max-content]",
				className,
			)}
		/>
	)
}
