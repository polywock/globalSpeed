import { isPromoLanguage, meetsPromoConditions, PROMO_MAX_AGE, PROMO_URL, PROMO_VIEW_KEYS, sanitizePromoConfig } from "@/utils/promoUtils"
import { fetchView, pushView } from "@/utils/state"

export async function handlePromo() {
	if (!isPromoLanguage()) return

	const view = await fetchView(PROMO_VIEW_KEYS)
	if (!meetsPromoConditions(view.selfPromoCountR, view.selfPromoFirstR, view.selfPromoHideTsR)) return

	const data = view.selfPromoData
	if (data?.fetched && Math.abs(Date.now() - data.fetched) < PROMO_MAX_AGE) return

	let config = data?.config
	let updated = data?.updated
	try {
		const resp = await fetch(PROMO_URL)
		if (resp.ok) {
			config = sanitizePromoConfig(await resp.json())
			updated = Date.now()
		}
	} catch (err) {}

	// Stamped even on failure
	pushView({ override: { selfPromoData: { fetched: Date.now(), updated, config } } })
}
