import { BsArrowUpCircle, BsXCircle } from "react-icons/bs"
import { useStateView } from "@/hooks/useStateView"
import "./OrlHeader.css"
import { Tooltip } from "@/comps/Tooltip"

type OrlHeaderProps = {}

export function OrlHeader(props: OrlHeaderProps) {
	const [view, setView] = useStateView({ hasOrl: true, minimizeOrlBanner: true, hideOrlBanner: true })
	if (!view || !view.hasOrl || view.hideOrlBanner) return <div />
	const m = view.minimizeOrlBanner

	return (
		<div
			className="OrmHeader"
			onClick={(e) => {
				setView({ minimizeOrlBanner: m ? null : true })
			}}
		>
			{m ? null : (
				<>
					<span>{gvar.gsm.options.rules.status}</span>
					<Tooltip title={gvar.gsm.token.hide}>
						<BsArrowUpCircle size={"1.285rem"} />
					</Tooltip>
					<Tooltip title={gvar.gsm.token.delete}>
						<BsXCircle
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
