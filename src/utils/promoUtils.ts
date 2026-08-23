import { gvar } from "@/globalVar"
import { AnyDict, SelfPromoConfig, SelfPromoEntry, SelfPromoGroup, SelfPromoPick, SelfPromoStyle, StateView, StateViewSelector } from "@/types"

const DAY = 24 * 36e5

export const PROMO_URL = "https://polywock.github.io/gs-promos/config.json"
export const PROMO_MAX_AGE = 3 * DAY
export const PROMO_EXPIRE_AGE = 7 * DAY

const MIN_COUNT = 50
const MIN_AGE = 7 * DAY
const HIDE_FOR = 14 * DAY

/** Everything isPromoShowing reads. */
export const PROMO_VIEW_KEYS: StateViewSelector = { selfPromoCountR: true, selfPromoFirstR: true, selfPromoHideTsR: true, selfPromoData: true }

const isEnglishTag = (tag: string) => {
	const v = (tag || "").toLowerCase()
	return v === "en" || v.startsWith("en-")
}

/** English only, since the promo text isn't localized. The browser has to be English, and so does the extension wherever its locale is known (the background has no gvar.gsm). */
export function isPromoLanguage() {
	if (!isEnglishTag(navigator.language)) return false
	const extLang = gvar.gsm?._lang
	return !extLang || isEnglishTag(extLang)
}

/** Every gate a promo has to pass to be on screen. */
export function isPromoShowing(view: StateView) {
	if (!view || !isPromoLanguage()) return false
	if (!isPromoFresh(view.selfPromoData?.updated)) return false
	return meetsPromoConditions(view.selfPromoCountR, view.selfPromoFirstR, view.selfPromoHideTsR)
}

export function meetsPromoConditions(count: number, firstTs: number, hideTs: number) {
	if ((count || 0) <= MIN_COUNT) return false
	// No timestamp means the first visit hasn't been recorded yet, so it can't be old enough.
	if (!firstTs || Date.now() - firstTs < MIN_AGE) return false
	return Date.now() - (hideTs || 0) > HIDE_FOR
}

export function isPromoFresh(updated: number) {
	return !!updated && Date.now() - updated < PROMO_EXPIRE_AGE
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
