import { FaRegQuestionCircle } from "react-icons/fa"
import { LuMessageCircleQuestion, LuTrophy } from "react-icons/lu"
import { TiDelete } from "react-icons/ti"
import { Tooltip } from "@/comps/Tooltip"
import { gvar } from "@/globalVar"
import { useStateView } from "@/hooks/useStateView"

let wasHidden = false

export function SelfPromo() {
	const [view, setView] = useStateView({ selfPromoCountR: true, selfPromoHideTsR: true })
	if (!view || wasHidden) return null

	if (!shouldShow(view.selfPromoCountR, view.selfPromoHideTsR)) {
		wasHidden = true
		document.documentElement.toggleAttribute("data-media-item-no-bottom-border", true)
		return null
	}

	return <div className="grid grid-cols-[1fr_max-content] items-center gap-x-1.25 p-2.5 select-none"></div>
}

/** English only, since the promo text isn't localized. Dismissing hides it for a week. */
const WEEK = 7 * 24 * 36e5
function shouldShow(count: number, hideTs: number) {
	if (gvar.gsm._lang !== "en") return false
	if ((count || 0) <= 50) return false
	return Date.now() - (hideTs || 0) > WEEK
}
