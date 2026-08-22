import { ReactNode } from "react"
import { FaLink } from "react-icons/fa"
import { MdWarning } from "react-icons/md"
import { Button } from "@/comps/ui/button"
import { cn } from "@/utils/helper"

type WarningBannerProps = {
	children: ReactNode
	className?: string
	action?: {
		label: ReactNode
		onClick: () => void
	}
}

export function WarningBanner({ children, className, action }: WarningBannerProps) {
	return (
		<div className={cn("mb-2.5 flex items-center rounded-lg border border-destructive bg-destructive/12 p-[0.6rem] text-destructive", className)}>
			<MdWarning className="mr-1.25" size="1.15rem" />
			<span>{children}</span>
			{action && (
				<Button variant="destructive" className="ml-2.5" onClick={action.onClick}>
					<FaLink className="size-4" />
					<span className="ml-1.25">{action.label}</span>
				</Button>
			)}
		</div>
	)
}
