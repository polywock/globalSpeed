import { ComponentPropsWithoutRef } from "react"
import { cn } from "@/utils/helper"

export function OptionFieldLabel({ className, ...props }: ComponentPropsWithoutRef<"div">) {
	return <div {...props} className={cn("grid grid-cols-[max-content_max-content] items-center gap-x-[10px]", className)} />
}
