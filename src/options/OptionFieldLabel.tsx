import { ComponentPropsWithoutRef } from "react"
import { cn } from "@/utils/helper"

export function OptionFieldLabel({ className, ...props }: ComponentPropsWithoutRef<"div">) {
	return <div {...props} className={cn("[&>*+*]:ml-2.5", className)} />
}
