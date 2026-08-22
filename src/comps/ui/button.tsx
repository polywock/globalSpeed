import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/helper"

const buttonVariants = cva(
	"group/button cursor-pointer inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				primary: "bg-primary text-primary-foreground hover:bg-primary/80",
				outline:
					"border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/15 dark:hover:bg-input/30",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
				ghost: "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
				destructive:
					"border-destructive/50 bg-transparent text-destructive hover:bg-destructive/10 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:hover:bg-destructive/20 dark:focus-visible:ring-destructive/40",
				icon: "border-none bg-transparent p-0 text-secondary-foreground [&_svg]:opacity-80 hover:[&_svg]:opacity-100",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-auto gap-1.5 px-2.5 py-1.25 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				control: "h-auto gap-1.5 p-1.25 [&_svg:not([class*='size-'])]:size-auto",
				compact: "h-auto gap-0 p-0.75 text-2xs [&_svg:not([class*='size-'])]:size-[1em]",
				xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
				lg: "h-auto gap-1.5 px-2.5 py-1.25 text-xl has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				xl: "h-auto gap-1.5 px-3 py-2.5 text-xl",
				icon: "size-8",
				"icon-auto": "size-auto gap-0 p-0 [&_svg:not([class*='size-'])]:size-auto",
				"icon-xs": "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
				"icon-lg": "size-9",
			},
		},
		defaultVariants: {
			variant: "outline",
			size: "default",
		},
	},
)

function Button({ className, variant = "outline", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
