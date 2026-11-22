import { ComponentPropsWithoutRef, useContext } from "react"
import { FieldLabelContext } from "@/comps/FieldLabel"
import { cn } from "@/utils/helper"

export function OptionFieldLabel({ className, ...props }: ComponentPropsWithoutRef<"div">) {
	// The field's controls point at this id through aria-labelledby.
	const id = useContext(FieldLabelContext)
	return <div id={id} {...props} className={cn("[&>*+*]:ml-2.5", className)} />
}
