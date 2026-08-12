import { ReactNode } from "react"
import { FaLink } from "react-icons/fa"
import { MdWarning } from "react-icons/md"
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
		<div className={cn("mb-2.5 flex items-center rounded-sm border border-destructive bg-destructive-bg p-[0.6rem] text-destructive", className)}>
			<MdWarning className="mr-1.25" size="1.15rem" />
			<span>{children}</span>
			{action && (
				<button
					className="ml-2.5 button-control rounded-bubble border border-destructive bg-inherit px-2 py-1 text-inherit"
					onClick={action.onClick}
				>
					<FaLink size="1.21rem" />
					<span className="ml-1.25">{action.label}</span>
				</button>
			)}
		</div>
	)
}
