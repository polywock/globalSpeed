import { TiDelete } from "react-icons/ti"
import { Tooltip } from "@/comps/Tooltip"
import { useStateView } from "@/hooks/useStateView"
import { isEdge, isMobile } from "@/utils/helper"
import { pushView } from "@/utils/state"
import "./QrPromo.css"

const ALWAYS_SHOW = false

let wasHidden = false

export function QrPromo(props: {}) {
	const [view, setView] = useStateView({ qrCodeHide: true, speedChangeCounter: true, qrCodeSeenCounter: true })
	if (!view || wasHidden) return null

	if (!ALWAYS_SHOW && (view.qrCodeHide || !validUserAgent() || (view.speedChangeCounter || 0) < 20 || view.qrCodeSeenCounter > 60)) {
		wasHidden = true
		document.documentElement.classList.add("noBottomBorderMediaItem")
		return null
	}
	!ALWAYS_SHOW && indicateSeen(view.qrCodeSeenCounter)

	return (
		<div className="QrPromo">
			<div>
				<div className="top">{gvar.gsm.options.flags.qrCodeTop}</div>
				<div className="bottom">{gvar.gsm.options.flags.qrCodeBottom}</div>
			</div>
			<img
				onClick={() => {
					chrome.tabs.create({ url: "https://edgemobileapp.microsoft.com?adjustId=1mhapodf_1mwtc6ik" })
				}}
				src={chrome.runtime.getURL("icons/qr.png")}
			/>
			<Tooltip title={gvar.gsm.token.delete}>
				<button
					onClick={() => {
						setView({ qrCodeHide: true })
					}}
					className="icon"
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
