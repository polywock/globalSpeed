import { TiDelete } from "react-icons/ti"
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

	return (
		<div className="grid grid-cols-[1fr_max-content] items-center gap-x-1.25 pt-3.75 pb-2.5 pl-2.5 select-none">
			<div
				className="group cursor-pointer"
				onClick={() => {
					chrome.tabs.create({ url: "https://www.reddit.com/r/GuessThePlace/" })
				}}
			>
				<div className="text-promo-md opacity-75">Love geography?</div>
				<div className="text-promo-lg font-bold text-promo transition-opacity duration-100 ease-linear group-hover:opacity-50">
					Join r/GuessThePlace
				</div>
			</div>
			<button
				onClick={() => {
					setView({ selfPromoHideTsR: Date.now() })
				}}
				className="icon-button leading-0"
			>
				<TiDelete size="30px" />
			</button>
		</div>
	)
}

/** English only, since the promo text isn't localized. Dismissing hides it for a week. */
const WEEK = 7 * 24 * 36e5
function shouldShow(count: number, hideTs: number) {
	if (gvar.gsm._lang !== "en") return false
	if ((count || 0) <= 50) return false
	return Date.now() - (hideTs || 0) > WEEK
}
