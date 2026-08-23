import { useMemo } from "react"
import { FaRegQuestionCircle } from "react-icons/fa"
import { Tooltip } from "@/comps/Tooltip"
import { useStateView } from "@/hooks/useStateView"
import { SelfPromoConfig } from "@/types"
import { isPromoShowing, pickPromoEntry, PROMO_VIEW_KEYS } from "@/utils/promoUtils"

let wasHidden = false

export function SelfPromo() {
	const [view] = useStateView(PROMO_VIEW_KEYS)
	if (!view || wasHidden) return null

	if (!isPromoShowing(view)) {
		wasHidden = true
		return null
	}

	return <PromoContent config={view.selfPromoData.config} />
}

function PromoContent({ config }: { config?: SelfPromoConfig }) {
	const entry = useMemo(() => pickPromoEntry(config), [])
	if (!entry) return null

	return (
		<div
			className={`mx-1.25 grid grid-cols-[1fr_max-content] items-center gap-x-1.5 border-t border-border py-2.5 pb-1 select-none [.SpeedControl+&]:mt-5`}
		>
			<div
				className="group cursor-pointer"
				onClick={() => {
					chrome.tabs.create({ url: entry.link })
				}}
			>
				{/* Primary */}
				<span className="text-promo-md italic opacity-70">{entry.primary}</span>

				{entry.style === "NEWLINE" ? (
					/* Secondary newline */
					<div className="text-promo -mt-[2px] text-promo-lg font-semibold italic opacity-70 transition-opacity duration-100 ease-linear group-hover:opacity-50">
						{entry.secondary}
					</div>
				) : (
					/* Secondary inline */
					<span className="text-promo-md font-semibold italic opacity-70 group-hover:underline"> {entry.secondary}</span>
				)}
			</div>
			<Tooltip title={entry.tooltip}>
				<FaRegQuestionCircle className="size-5 opacity-50 group-hover:opacity-90" />
			</Tooltip>
		</div>
	)
}
