import { AnyDict, SelfPromoConfig, SelfPromoEntry, SelfPromoGroup, SelfPromoPick, SelfPromoStyle } from "@/types"

/** Pages, not jsDelivr: jsDelivr pins @main URLs for 12h, so promos couldn't be pulled quickly. */
export const PROMO_URL = "https://polywock.github.io/gs-promos/config.json"
/** Refetch at most this often. */
export const PROMO_MAX_AGE = 3 * 36e5
/** Reddit visits before the promo is considered. */
const MIN_COUNT = 50
/** Dismissing hides it for 2 week(s). */
const WEEK = 14 * 24 * 36e5

export function meetsPromoConditions(count: number, hideTs: number) {
	if ((count || 0) <= MIN_COUNT) return false
	return Date.now() - (hideTs || 0) > WEEK
}

const isFr = (v: any) => v == null || (typeof v === "number" && v >= 0)
const sanitizeStyle = (v: any): SelfPromoStyle => (v === "NEWLINE" || v === "INLINE" ? v : undefined)

/** Remote data, so drop anything malformed instead of rendering it. */
export function sanitizePromoConfig(raw: AnyDict): SelfPromoConfig {
	const rawGroups = Array.isArray(raw?.groups) ? raw.groups : []

	const groups = rawGroups.flatMap((g: AnyDict) => {
		if (!g || typeof g.tooltip !== "string" || !isFr(g.fr)) return []

		const entries = (Array.isArray(g.entries) ? g.entries : []).filter((e: AnyDict) => {
			if (!e) return false
			if (typeof e.primary !== "string" || typeof e.secondary !== "string") return false
			if (!isFr(e.fr)) return false
			return typeof e.link === "string" && e.link.startsWith("https://")
		}) as SelfPromoEntry[]
		if (!entries.length) return []

		return [{ entries, tooltip: g.tooltip, style: sanitizeStyle(g.style), fr: g.fr ?? undefined }] as SelfPromoGroup[]
	}) as SelfPromoGroup[]

	return { groups }
}

/** Picks a group, then one of its entries, both weighted by fr. */
export function pickPromoEntry(config: SelfPromoConfig): SelfPromoPick {
	const group = pickWeighted(config?.groups)
	if (!group) return null

	const entry = pickWeighted(group.entries)
	if (!entry) return null

	const { entries, ...groupBase } = group
	return { ...groupBase, ...entry }
}

function pickWeighted<T extends { fr?: number }>(items: T[]): T {
	if (!items?.length) return null

	const weight = (item: T) => Math.max(0, item.fr ?? 1)
	const total = items.reduce((sum, item) => sum + weight(item), 0)
	if (!total) return null

	let roll = Math.random() * total
	for (let item of items) {
		roll -= weight(item)
		if (roll < 0) return item
	}
	return items[items.length - 1]
}
