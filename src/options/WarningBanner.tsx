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
		<div
			className={cn(
				"WarningBanner mb-[10px] flex items-center rounded-sm border border-solid border-destructive bg-destructive-bg p-[0.6rem] text-destructive",
				className,
			)}
		>
			<MdWarning className="mr-[5px]" size="1.15rem" />
			<span>{children}</span>
			{action && (
				<button
					className="ml-[10px] rounded-[10px] border border-solid border-destructive bg-[inherit] px-[8px] py-[4px] text-[inherit]"
					onClick={action.onClick}
				>
					<FaLink size="1.21rem" />
					<span className="ml-[5px]">{action.label}</span>
				</button>
			)}
		</div>
	)
}
