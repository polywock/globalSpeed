import { BsArrowUpCircle, BsXCircle } from "react-icons/bs"
import { Tooltip } from "@/comps/Tooltip"
import { gvar } from "@/globalVar"
import { useStateView } from "@/hooks/useStateView"

type OrlHeaderProps = {}

export function OrlHeader(props: OrlHeaderProps) {
	const [view, setView] = useStateView({ hasOrl: true, minimizeOrlBanner: true, hideOrlBanner: true })
	if (!view || !view.hasOrl || view.hideOrlBanner) return <div />
	const m = view.minimizeOrlBanner

	return (
		<div
			className="grid grid-cols-[1fr_max-content_max-content] items-center gap-x-1.75 border-0 border-b border-border-subtle bg-secondary px-2.5 py-1.25 text-header [font-weight:bolder] text-foreground select-none"
			onClick={(e) => {
				setView({ minimizeOrlBanner: m ? null : true })
			}}
		>
			{m ? null : (
				<>
					<span className="opacity-70">{gvar.gsm.options.rules.status}</span>
					<Tooltip title={gvar.gsm.token.hide}>
						<BsArrowUpCircle className="cursor-pointer hover:opacity-50" size={"1.285rem"} />
					</Tooltip>
					<Tooltip title={gvar.gsm.token.delete}>
						<BsXCircle
							className="cursor-pointer hover:opacity-50"
							onClickCapture={(e: React.MouseEvent) => {
								setView({ hasOrl: false })
								e.stopPropagation()
							}}
							size={"1.285rem"}
						/>
					</Tooltip>
				</>
			)}
		</div>
	)
}
