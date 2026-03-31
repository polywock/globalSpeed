import { AnyDict, AudioFx, Context, CONTEXT_KEYS, Fx, IndicatorInit, Keybind, State, URLCondition, URLConditionPart, URLRule } from "../types"
import { chunkByPredicate, isMobile, randomId } from "../utils/helper"
import { getDefaultMenuKeybinds, getDefaultPageKeybinds } from "./commands"
import { filterInfos, FilterName } from "./filters"

export type WebsiteInfo = {
	v: string
	contains?: boolean
}

export const SHORTCUT_ALLOWED_WEBSITES: WebsiteInfo[] = [
	{ v: "https://www.youtube.com" },
	{ v: "https://www.netflix.com" },
	{ v: "https://www.twitch.tv" },
	{ v: "https://www.hulu.com" },
	{ v: "https://www.disneyplus.com" },
	{ v: "https://play.max.com" },
	{ v: "https://www.amazon.com/gp/video" },
	{ v: "https://www.peacocktv.com" },
	{ v: "https://tv.apple.com" },
	{ v: "https://www.paramountplus.com" },
	{ v: "https://www.crunchyroll.com" },
	{ v: "https://www.dailymotion.com" },
	{ v: "https://www.bilibili.com" },
	{ v: "https://www.iqiyi.com" },
	{ v: "https://v.youku.com" },
	{ v: "https://v.qq.com" },
	{ v: "https://pan.baidu.com" },
	{ v: "https://www.nicovideo.jp" },
	{ v: "https://www.bbc.com/video" },
]

export function turnWebsiteInfoIntoString(info: WebsiteInfo) {
	if (info.contains) return `contains_${info.v}`
	return `starts_${info.v}`
}

export function generateUrlPart(origin: string): URLConditionPart {
	return {
		id: randomId(),
		type: "STARTS_WITH",
		valueStartsWith: origin,
		valueContains: origin,
		valueRegex: "",
	}
}

export function getDefaultState(): State {
	let state = {
		version: 14,
		freshState: true,
		firstUse: Date.now(),
		pageKeybinds: getDefaultPageKeybinds(),
		menuKeybinds: getDefaultMenuKeybinds(),
		browserKeybinds: [] as Keybind[],
		freshKeybinds: true,
		...getDefaultContext(),
		keybindsUrlCondition: getDefaultKeybindsUrlConditions(),
		hideMediaView: isMobile(),
		holdToSpeed: isMobile() ? 2 : undefined,
	} satisfies State

	return state
}

export function getDefaultKeybindsUrlConditions(): URLCondition {
	return {
		block: false,
		allowParts: SHORTCUT_ALLOWED_WEBSITES.map((origin) => {
			const part = generateUrlPart(origin.v)
			if (origin.contains) part.type = "CONTAINS"
			return part
		}),
		blockParts: [],
	}
}

export function getEmptyUrlConditions(block?: boolean) {
	return {
		block,
		blockParts: [],
		allowParts: [],
	} as URLCondition
}

export function getDefaultContext(withNulls?: boolean): Context {
	const obj: AnyDict = {
		speed: 1,
		enabled: true,
		audioFx: null,
	}
	withNulls &&
		CONTEXT_KEYS.forEach((key) => {
			obj[key] = obj[key] ?? null
		})
	return obj as Context
}

export function getDefaultFx(): Fx {
	const [passed, failed] = chunkByPredicate(Object.entries(filterInfos), ([k, v]) => v.isTransform)
	return {
		filters: failed.map(([k, v]) => ({ name: k as FilterName, value: v.ref.default })),
		transforms: passed.map(([k, v]) => ({ name: k as FilterName, value: v.ref.default })),
	}
}

export function getDefaultAudioFx(): AudioFx {
	return {
		pitch: 0,
		volume: 1,
		delay: 0,
		eq: getDefaultEq(),
	}
}

export function getDefaultEq(): AudioFx["eq"] {
	return {
		enabled: false,
		factor: 1,
		values: Array(10).fill(0),
	}
}

export function getDefaultURLConditionPart(): URLConditionPart {
	return {
		type: "CONTAINS",
		valueContains: "example.com",
		valueStartsWith: String.raw`https://example.com`,
		valueRegex: String.raw`example\.com`,
		id: randomId(),
	}
}

export function getDefaultURLCondition(block?: boolean): URLCondition {
	return {
		block,
		blockParts: [],
		allowParts: [],
	}
}

export function getDefaultURLRule(): URLRule {
	return {
		id: randomId(),
		enabled: true,
		type: "SPEED",
		overrideSpeed: 1,
		overrideJs: `// Javascript here\n`,
	}
}

export const INDICATOR_INIT: IndicatorInit = {
	position: "TL",
	backgroundColor: "#000000",
	textColor: "#ffffff",
	scaling: 1,
	rounding: 4,
	duration: 1,
	offset: 1,
}

export const INDICATOR_CIRCLE_INIT: IndicatorInit = {
	...INDICATOR_INIT,
	position: "C",
	rounding: 3,
	scaling: 1.2,
	showShadow: true,
}
