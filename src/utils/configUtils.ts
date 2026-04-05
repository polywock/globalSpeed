import { svgFilterIsValid } from "@/defaults/filters"
import { SVG_FILTER_ADDITIONAL } from "@/defaults/svgFilterAdditional"
import type { MediaEvent } from "../contentScript/isolated/utils/applyMediaEvent"
import { filterInfos } from "../defaults/filters"
import {
	AdjustMode,
	Duration,
	KeybindMatch,
	KeybindType,
	ReferenceValues,
	SvgFilter,
	Trigger,
	type FilterEntry,
	type Keybind,
	type TargetFx,
	type TargetFxFlags,
	type URLCondition,
	type URLConditionPart,
} from "../types"
import { clamp, isFirefox, round } from "./helper"
import { compareHotkeys, Hotkey } from "./keys"
import { fetchView, pushView } from "./state"

const DEBUG_PREFIX = "[GS-DBG]"

// Color styles per module
const LogStyles = {
	sendMediaEvent: { color: "#FF6B6B" }, // Red
	getAutoMedia: { color: "#51CF66" }, // Green
	processKeybindMatch: { color: "#4DABF7" }, // Blue
	temporarySpeed: { color: "#B197FC" }, // Purple
	setValue: { color: "#22B8CF" }, // Cyan
	MessageTower: { color: "#FFD43B" }, // Yellow
}

function getModuleStyle(scope: string) {
	const module = scope.split(":")[0]
	return LogStyles[module as keyof typeof LogStyles] || { color: "#999", emoji: "🔹" }
}

function logInfo(scope: string, details?: {[key: string]: any} | string) {
	const style = getModuleStyle(scope)
	const headerStyle = `color: ${style.color}; font-weight: bold; font-size: 12px;`
	const detailStr = typeof details === "string" ? details : objectToString(details)
	console.log(`%c[${scope}]`, headerStyle, detailStr || "")
}

function logError(scope: string, details?: {[key: string]: any} | string) {
	const style = getModuleStyle(scope)
	const headerStyle = `color: ${style.color}; font-weight: bold; font-size: 12px; background: #f0f0f0; padding: 2px 4px;`
	const detailStr = typeof details === "string" ? details : objectToString(details)
	console.error(`%c[ERROR][${scope}]`, headerStyle, detailStr || "")
}

function objectToString(obj?: {[key: string]: any}): string {
	if (!obj) return ""
	return Object.entries(obj)
		.map(([k, v]) => {
			if (v === undefined || v === null) return `${k}: —`
			if (typeof v === "object") return `${k}: [${typeof v}]`
			return `${k}: ${v}`
		})
		.join(" | ")
}

export function conformSpeed(speed: number, rounding = 2) {
	return clamp(0.07, 16, round(speed, rounding))
}

export function formatSpeedOld(speed: number) {
	return speed.toFixed(2)
}

export function formatSpeed(speed: number, snip = false) {
	let speedString = speed.toFixed(2)
	if (snip && speedString.at(-1) === "0") {
		speedString = speedString.slice(0, -1)
	}
	return speedString
}

export function formatSpeedForBadge(speed: number) {
	return formatSpeed(speed).slice(0, isFirefox() ? 3 : 4)
}

export function formatFilters(filterValues: FilterEntry[]) {
	let parts: string[] = []
	filterValues?.forEach((v) => {
		const filterInfo = filterInfos[v.name]
		if (v.value != null && v.value !== filterInfo.ref.default) {
			parts.push(filterInfo.format(v.value))
		}
	})
	return parts.join(" ")
}

export function hasActiveSvgFilters(filters: SvgFilter[]) {
	if (
		filters?.filter((f) => {
			if (!f.enabled) return
			const typeInfo = SVG_FILTER_ADDITIONAL[f.type]
			if (svgFilterIsValid(f, typeInfo.isValid)) return true
		}).length
	)
		return true
}

export function checkFilterDeviation(values: FilterEntry[]) {
	for (let v of values || []) {
		const filterInfo = filterInfos[v.name]
		if (v.value != null && v.value !== filterInfo.ref.default) {
			return true
		}
	}
}

export function checkFilterDeviationOrActiveSvg(filters: FilterEntry[], svgFilters: SvgFilter[]) {
	return checkFilterDeviation(filters) || hasActiveSvgFilters(svgFilters)
}

export function intoFxFlags(target: TargetFx) {
	const flags: TargetFxFlags = {}
	if (target === "backdrop" || target === "both") {
		flags.backdrop = true
	}
	if (target === "element" || target === "both") {
		flags.element = true
	}
	return flags
}

export function sendMediaEvent(event: MediaEvent, key: string, tabId: number, frameId: number) {
	const payload = { type: "APPLY_MEDIA_EVENT", event, key }
	const frameAttempts = [frameId, 0].filter((v, i, arr) => v != null && arr.indexOf(v) === i)
	logInfo("sendMediaEvent:start", `event=${event?.type} key=${key} target=[${tabId}:${frameId}] attempts=${frameAttempts.join(",")}`)

	if (gvar?.tabInfo?.tabId === tabId && gvar.tabInfo.frameId === frameId) {
		// realizeMediaEvent(key, event)
		logInfo("sendMediaEvent:same-frame", `key=${key} event=${event?.type}`)
	}

	void (async () => {
		let lastError: any
		const checkContentScript = async (tabId: number, frameId: number): Promise<boolean> => {
			try {
				await chrome.tabs.sendMessage(tabId, { type: "CS_ALIVE" }, { frameId: frameId || 0 })
				return true
			} catch (err) {
				return false
			}
		}

		for (const attemptFrameId of frameAttempts) {
			try {
				const isAlive = await checkContentScript(tabId, attemptFrameId)
				logInfo("sendMediaEvent:frame-check", `key=${key} frame=${attemptFrameId} alive=${isAlive}`)

				if (!isAlive) {
					logError("sendMediaEvent:frame-dead", `key=${key} frame=${attemptFrameId} (skipping)`)
					continue
				}

				logInfo("sendMediaEvent:attempt", `event=${event?.type} key=${key} frame=${attemptFrameId}`)

				const response = await chrome.tabs.sendMessage(tabId, payload, { frameId: attemptFrameId })
				logInfo("sendMediaEvent:success", `event=${event?.type} key=${key} frame=${attemptFrameId} fallback=${attemptFrameId !== frameId}`)
				return
			} catch (error) {
				lastError = error
				logError("sendMediaEvent:attempt-failed", `event=${event?.type} key=${key} frame=${attemptFrameId} error=${error}`)
			}
		}

		logError("sendMediaEvent:failed", `event=${event?.type} key=${key} allAttempts=${frameAttempts} error=${lastError}`)
	})()
}

export function sendMessageToConfigSync(msg: any, tabId: number, frameId?: number) {
	chrome.tabs.sendMessage(tabId, msg, frameId == null ? undefined : { frameId })
}

export function testURLWithPart(url: string, p: URLConditionPart) {
	if (p.type === "STARTS_WITH") {
		return url.startsWith(p.valueStartsWith)
	} else if (p.type === "CONTAINS") {
		return url.includes(p.valueContains)
	} else if (p.type === "REGEX") {
		try {
			return new RegExp(p.valueRegex).test(url)
		} catch (err) {}
	}
}

export function getSelectedParts(c: URLCondition) {
	return (c?.block ? c?.blockParts : c?.allowParts) || []
}

export function getActiveParts(c: URLCondition) {
	return getSelectedParts(c).filter((p) => !p.disabled)
}

export function hasActiveParts(c: URLCondition) {
	return getActiveParts(c).length > 0
}

export function testURL(url: string, c: URLCondition, neutral?: boolean) {
	const parts = getActiveParts(c)
	if (!parts.length) return neutral
	const matched = parts.some((p) => testURLWithPart(url, p))
	return c.block ? !matched : matched
}

export function extractURLPartValueKey(part: URLConditionPart): "valueContains" | "valueStartsWith" | "valueRegex" {
	return part.type === "CONTAINS" ? "valueContains" : part.type === "STARTS_WITH" ? "valueStartsWith" : "valueRegex"
}

export function requestSyncContextMenu(direct?: boolean) {
	chrome.runtime.sendMessage({ type: "SYNC_CONTEXT_MENUS", direct })
}

export function isSeekSmall(kb: Keybind, ref?: ReferenceValues) {
	if (kb.adjustMode === AdjustMode.ADD) {
		let val = kb.valueNumber ?? ref?.step
		if ((kb.duration || Duration.SECS) === Duration.SECS) return Math.abs(val) < 0.5
		if (kb.duration === Duration.FRAMES) return Math.abs(val) < 14
	}
}

export function findMatchingPageKeybinds(kbs: Keybind[], key?: Hotkey): KeybindMatch[] {
	return kbs
		.filter((kb) => kb.enabled)
		.map((kb) => {
			if (kb.key && compareHotkeys(kb.key, key)) return { kb }
			if (kb.allowAlt && kb.adjustMode === AdjustMode.CYCLE && compareHotkeys(kb.keyAlt, key)) return { kb, alt: true }
		})
		.filter((v) => v)
}

export function findMatchingBrowserKeybinds(kbs: Keybind[], global?: string): KeybindMatch[] {
	return kbs
		.filter((kb) => kb.enabled)
		.map((kb) => {
			if ((kb.globalKey || "commandA") === global) return { kb }
			if (kb.allowAlt && kb.adjustMode === AdjustMode.CYCLE && (kb.globalKeyAlt || "commandA") === global) return { kb, alt: true }
		})
		.filter((v) => v)
}

export function findMatchingMenuKeybinds(kbs: Keybind[], id: string): KeybindMatch[] {
	return kbs
		.filter((kb) => kb.enabled)
		.map((kb) => {
			if (kb.id === id) return { kb }
			if (kb.allowAlt && kb.adjustMode === AdjustMode.CYCLE && `ALT_${kb.id}` === id) return { kb, alt: true }
		})
		.filter((v) => v)
}

export function triggerToKey(trigger: Trigger): KeybindType {
	if (trigger === Trigger.BROWSER) return "browserKeybinds"
	if (trigger === Trigger.MENU) return "menuKeybinds"
	return "pageKeybinds"
}

export async function handleFreshState() {
	if (!(await fetchView({ freshState: true })).freshState) return
	const darkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
	await pushView({
		override: {
			freshState: null,
			darkTheme,
		},
	})
}
