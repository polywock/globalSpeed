import { meetsPromoConditions, PROMO_MAX_AGE, PROMO_URL, sanitizePromoConfig } from "@/utils/promoUtils"
import { fetchView, pushView } from "@/utils/state"

export async function handlePromo() {
	const view = await fetchView({ selfPromoCountR: true, selfPromoFirstR: true, selfPromoHideTsR: true, selfPromoData: true, language: true })
	if (!meetsPromoConditions(view.selfPromoCountR, view.selfPromoFirstR, view.selfPromoHideTsR)) return
	if (!isEnglish(view.language)) return

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

function isEnglish(language: string) {
	if (language) return language === "en"
	const nav = (navigator.language || "").toLowerCase()
	return nav === "en" || nav.startsWith("en-")
}
