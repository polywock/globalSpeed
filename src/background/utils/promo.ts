import { meetsPromoConditions, PROMO_MAX_AGE, PROMO_URL, sanitizePromoConfig } from "@/utils/promoUtils"
import { fetchView, pushView } from "@/utils/state"

export async function handlePromo() {
	const view = await fetchView({ selfPromoCountR: true, selfPromoHideTsR: true, selfPromoData: true, language: true })
	if (!meetsPromoConditions(view.selfPromoCountR, view.selfPromoHideTsR)) return
	if (!isEnglish(view.language)) return

	const data = view.selfPromoData
	if (data?.fetched && Math.abs(Date.now() - data.fetched) < PROMO_MAX_AGE) return

	let config = data?.config
	try {
		const resp = await fetch(PROMO_URL)
		if (resp.ok) config = sanitizePromoConfig(await resp.json())
	} catch (err) {}

	// Stamped even on failure
	pushView({ override: { selfPromoData: { fetched: Date.now(), config } } })
}

function isEnglish(language: string) {
	if (language && language !== "detect") return language === "en"
	const nav = (navigator.language || "").toLowerCase()
	return nav === "en" || nav.startsWith("en-")
}
