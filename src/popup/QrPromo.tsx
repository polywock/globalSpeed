import { TiDelete } from "react-icons/ti"
import { Tooltip } from "@/comps/Tooltip"
import { gvar } from "@/globalVar"
import { useStateView } from "@/hooks/useStateView"
import { cn, isEdge, isMobile } from "@/utils/helper"
import { pushView } from "@/utils/state"

const ALWAYS_SHOW = false

// Disabled for now. SelfPromo handles the bottom border while this is off.
const DISABLED = true

let wasHidden = false

export function QrPromo() {
	const [view, setView] = useStateView({ qrCodeHide: true, speedChangeCounter: true, qrCodeSeenCounter: true })
	if (DISABLED || !view || wasHidden) return null

	if (!ALWAYS_SHOW && (view.qrCodeHide || !validUserAgent() || (view.speedChangeCounter || 0) < 20 || view.qrCodeSeenCounter > 60)) {
		wasHidden = true
		document.documentElement.classList.add("noBottomBorderMediaItem")
		return null
	}
	!ALWAYS_SHOW && indicateSeen(view.qrCodeSeenCounter)

	return (
		<div
			className={cn(
				"grid grid-cols-[1fr_max-content_max-content] items-center gap-x-[7px] pt-[20px] pb-[10px] pl-[10px] select-none",
				"dark:hidden",
			)}
		>
			<div>
				<div className="text-[14px]">{gvar.gsm.options.flags.qrCodeTop}</div>
				<div className="text-[18px] font-bold text-chart-5">{gvar.gsm.options.flags.qrCodeBottom}</div>
			</div>
			<img
				className="cursor-pointer"
				onClick={() => {
					chrome.tabs.create({ url: "https://edgemobileapp.microsoft.com?adjustId=1mhapodf_1mwtc6ik" })
				}}
				src={chrome.runtime.getURL("images/qr.png")}
			/>
			<Tooltip title={gvar.gsm.token.delete}>
				<button
					onClick={() => {
						setView({ qrCodeHide: true })
					}}
					className="icon leading-0"
				>
					<TiDelete size="30px" />
				</button>
			</Tooltip>
		</div>
	)
}

let ranAlready = false
function indicateSeen(seenX: number) {
	if (ranAlready) return
	ranAlready = true
	pushView({ override: { qrCodeSeenCounter: (seenX || 0) + 1 } })
}

function validUserAgent() {
	return !isMobile() && isEdge()
}
