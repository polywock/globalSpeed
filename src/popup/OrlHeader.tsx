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
			className="OrmHeader grid grid-cols-[1fr_max-content_max-content] items-center gap-x-[7px] border-0 border-b border-solid border-border bg-secondary px-[10px] py-[5px] text-[0.8rem] [font-weight:bolder] text-foreground select-none"
			onClick={(e) => {
				setView({ minimizeOrlBanner: m ? null : true })
			}}
		>
			{m ? null : (
				<>
					<span className="opacity-70">{gvar.gsm.options.rules.status}</span>
					<Tooltip title={gvar.gsm.token.hide}>
						<BsArrowUpCircle className="cursor-pointer [&:hover]:opacity-50" size={"1.285rem"} />
					</Tooltip>
					<Tooltip title={gvar.gsm.token.delete}>
						<BsXCircle
							className="cursor-pointer [&:hover]:opacity-50"
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
