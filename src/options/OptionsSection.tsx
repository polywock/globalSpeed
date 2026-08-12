import { ComponentPropsWithoutRef } from "react"
import { cn } from "@/utils/helper"

export function OptionsSection({ className, ...props }: ComponentPropsWithoutRef<"div">) {
	return (
		<div
			{...props}
			className={cn(
				"mb-10 rounded-2xl bg-background p-5 text-foreground shadow-[0_2px_8px_0_color-mix(in_oklab,black_40%,transparent)] [&>h2]:mt-0",
				className,
			)}
		/>
	)
}
