import { IndicatorShowOpts } from "@/contentScript/isolated/utils/Indicator"
import { gvar } from "@/globalVar"
import { loadGsm } from "@/utils/gsm"
import { Gsm } from "@/utils/GsmType"
import { hashWithStoredSalt } from "@/utils/hash"
import { produce } from "@/utils/helper"
import { afxContinuousMap, getItcSelector, getItcValues, supportsItc } from "@/utils/itcUtils"
import type { MediaEvent, MediaEventCinema } from "../../contentScript/isolated/utils/applyMediaEvent"
import { FlatMediaInfo } from "../../contentScript/isolated/utils/genMediaInfo"
import { getDefaultAudioFx, getDefaultFx } from "../../defaults"
import { commandInfos, CommandName } from "../../defaults/commands"
import { filterInfos, FilterName } from "../../defaults/filters"
import {
	AdjustMode,
	Command,
	Duration,
	ItcInit,
	ItcRelated,
	Keybind,
	KeybindMatch,
	KeybindType,
	MediaProbe,
	ReferenceValues,
	StateView,
	StateViewSelector,
} from "../../types"
import { checkContentScript, sendToFrame, TabInfo } from "../../utils/browserUtils"
import { intoFxFlags, isSeekSmall, sendMediaEvent, sendMessageToConfigSync, triggerToKey } from "../../utils/configUtils"
import { clamp, createWindowWithSafeBounds, formatDuration, round, timeout } from "../../utils/helper"
import { fetchView, pushView, PushViewInit } from "../../utils/state"
import { getAutoMedia } from "./getAutoMedia"
import { KeepAlive } from "./KeepAlive"
import { runUserJs } from "./runUserJs"
import { initTabCapture, isTabCaptured, releaseTabCapture } from "./tabCapture"

let lastSeek: { key: string; time: number; net: number }

export class ProcessKeybinds {
	globalHideIndicator: boolean
	shortcutHideIndicator = false
	loadedMedia?: { value: FlatMediaInfo }
	loadedMediaVideo?: { value: FlatMediaInfo }
	stopped = false
	constructor(
		private matches: KeybindMatch[],
		public tabInfo: TabInfo,
		public source: KeybindType,
	) {
		this.init()
	}
	stop = () => {
		this.stopped = true
	}
	init = async () => {
		this.globalHideIndicator = (await gvar.es.getAllUnsafe())["g:hideIndicator"]

		for (let match of this.matches) {
			if (this.stopped) return
			await this.processKeybindMatch(match)
		}
	}
	fetch = async (selector: StateViewSelector) => {
		return fetchView(selector, this.tabInfo?.tabId)
	}
	push = async (override: StateView, extraInit?: PushViewInit) => {
		return pushView({ override, tabId: this.tabInfo?.tabId, ...(extraInit ?? null) })
	}
	show = async (opts: IndicatorShowOpts) => {
		if (!this.tabInfo) return
		if (this.shortcutHideIndicator) return

		sendMessageToConfigSync({ type: "SHOW_INDICATOR", opts, requiresFocus: this.tabInfo.frameId == null ? true : false }, this.tabInfo.tabId, 0)
	}
	// The widget only ever lives in the top frame.
	sendItcs = (inits: ItcInit[]) => {
		chrome.tabs.sendMessage(this.tabInfo.tabId, { type: "ITC", inits } as Messages, { frameId: 0 })
	}
	applyToMedia = async (e: MediaEvent, requiresVideo = false) => {
		const media = await this.getMediaAny(requiresVideo)
		if (!media) return
		sendMediaEvent(e, media.key, media.tabInfo.tabId, media.tabInfo.frameId)
	}
	getMediaAny = async (requiresVideo = false) => {
		if (this.loadedMedia) return this.loadedMedia.value
		this.loadedMedia = { value: await getAutoMedia(this.tabInfo, requiresVideo) }
		return this.loadedMedia.value
	}
	getMediaVideo = async () => {
		if (this.loadedMediaVideo) return this.loadedMediaVideo.value
		this.loadedMediaVideo = { value: await getAutoMedia(this.tabInfo, true) }
		return this.loadedMediaVideo.value
	}
	autoCaptureWithCheck = (c: Command, value: number) => {
		if (c.valueType === "adjustMode" && value?.toFixed(6) !== c.ref.default.toFixed(6)) {
			this.autoCapture()
		}
	}
	autoCapture = () => {
		if (this.tabInfo?.tabId == null) return
		initTabCapture(this.tabInfo.tabId)
	}
	processKeybindMatch = async (match: KeybindMatch) => {
		let kb = match.kb
		let commandInfo = commandInfos[kb.command]
		let media: FlatMediaInfo

		if (commandInfo.requiresVideo) {
			media = await this.getMediaVideo()
			if (!media) return
		} else if (commandInfo.requiresMedia) {
			media = await this.getMediaAny()
			if (!media) return
		}

		let override: StateView = {}
		this.shortcutHideIndicator = kb.invertIndicator ? !this.globalHideIndicator : this.globalHideIndicator
		await commandHandlers[kb.command]({ media, override, commandInfo, kb, isAlt: match.alt, ...this })
		if (Object.keys(override).length) await pushView({ override, tabId: this.tabInfo?.tabId })
	}
}

type CommandHandlerArgs = ProcessKeybinds & {
	media: FlatMediaInfo
	override: StateView
	kb: Keybind
	commandInfo: Command
	isAlt?: boolean
}

let nothingSymbolMap: { [key: string]: Symbol } = {}
let nothingLastCalledAt: { [key: string]: number } = {}

const commandHandlers: {
	[key in CommandName]: (args: CommandHandlerArgs) => Promise<void>
} = {
	nothing: async (args) => {
		if (!(args.kb.valueNumber > 0)) return

		const now = Date.now()

		// first in series, make it 0.35
		let delay = args.kb.valueNumber

		if (delay < 0.35) {
			let delta = now - nothingLastCalledAt[args.kb.id]
			if (delta > 300 || isNaN(delta)) {
				delay = 0.35
			}
			nothingLastCalledAt[args.kb.id] = now
		}

		let symbol = Symbol()
		nothingSymbolMap[args.kb.id] = symbol
		delay > 10 && KeepAlive.start(delay / 60 + 0.5)
		await timeout(delay * 1000)
		if (nothingSymbolMap[args.kb.id] !== symbol) {
			args.stop()
		}
	},
	runCode: async (args) => {
		const { kb, tabInfo } = args
		if (!tabInfo || !(await checkContentScript(tabInfo.tabId, tabInfo.frameId || 0))) return

		runUserJs(tabInfo.tabId, kb.valueString)
	},
	openUrl: async (args) => {
		const { kb, tabInfo } = args
		let url = kb.valueString

		if (kb.valueUrlMode === "sameTab") {
			if (!tabInfo) return
			chrome.tabs.update(tabInfo.tabId, { url })
			return
		}

		let active = (kb.valueUrlMode || "fgTab") === "fgTab"
		if (active || kb.valueUrlMode === "bgTab") {
			let index = tabInfo?.tabId ? (await chrome.tabs.get(tabInfo.tabId)).index + 1 : undefined
			chrome.tabs.create({
				url,
				index,
				active,
			})
			return
		}

		let popup = kb.valueUrlMode === "newPopup"
		if (popup || kb.valueUrlMode === "newWindow") {
			await createWindowWithSafeBounds({
				url,
				type: popup ? "popup" : "normal",
				...(kb.valuePopupRect || {}),
			})
		}
	},
	intoPopup: async (args) => {
		const { kb, tabInfo } = args
		if (!tabInfo.tabId) return
		const tab = await chrome.tabs.get(tabInfo.tabId)
		const window = await chrome.windows.get(tab.windowId)
		const storageKey = `s:popup:${tab.id}`

		if (window.type === "popup") {
			let recoverInfo = (await chrome.storage.session.get<RecordAny>(storageKey))[storageKey]
			await chrome.windows.create({ tabId: tab.id, type: "normal", state: "normal", ...(recoverInfo ? { width: 50, height: 50 } : {}) })
			if (!recoverInfo) return
			try {
				await chrome.windows.get(recoverInfo.windowId)
			} catch (err) {
				return
			}

			await chrome.tabs.move(tab.id, { windowId: recoverInfo.windowId, index: recoverInfo.index })
			chrome.tabs.update(tab.id, { active: true })
			return
		}
		chrome.storage.session.set({ [storageKey]: { windowId: window.id, index: tab.index, state: window.state } })
		await createWindowWithSafeBounds({
			type: "popup",
			tabId: tab.id,
			...(kb.valuePopupRect || {}),
		})
	},
	muteTab: async (args) => {
		if (!args.tabInfo?.tabId) return
		let tabId = args.tabInfo.tabId
		const isMuted = (await chrome.tabs.get(tabId))?.mutedInfo?.muted
		args.show({ text: isMuted ? "100%" : "0%" })
		chrome.tabs.update(tabId, { muted: !isMuted })
	},
	state: async (args) => {
		const { kb, show, override, fetch } = args
		const view = await fetch({ enabled: true, latestViaShortcut: true })
		override.latestViaShortcut = true
		if (kb.valueState === "off" || (kb.valueState === "toggle" && view.enabled)) {
			override.enabled = false
		} else {
			override.enabled = true
		}
		show({
			text: ` ${override.enabled ? "on" : "off"}`,
			icons: ["power"],
		})
	},
	pin: async (args) => {
		const { kb, tabInfo, override, show, fetch } = args
		if (!tabInfo) return
		const view = await fetch({ isPinned: true })
		if (kb.valueState === "off" || (kb.valueState === "toggle" && view.isPinned)) {
			override.isPinned = false
		} else {
			override.isPinned = true
		}
		show({ text: override.isPinned ? "local" : "global", small: true })
	},
	speed: async (args) => {
		return processAdjustMode(args)
	},
	temporarySpeed: async ({ media, show, kb, commandInfo, source }) => {
		const factor = round(kb.valueNumber || commandInfo.ref.default, 2)
		show({ text: `${factor}x` })
		activateTemporarySpeed(media, factor, source)
	},
	speedChangesPitch: async (args) => {
		const { kb, show, override, fetch } = args
		const view = await fetch({ freePitch: true })
		if (kb.valueState === "off" || (kb.valueState === "toggle" && view.freePitch)) {
			override.freePitch = false
		} else {
			override.freePitch = true
		}
		show({
			text: ` ${override.freePitch ? "on" : "off"}`,
			icons: ["speedChangesPitch"],
		})
	},
	seek: async (args) => {
		return processAdjustMode(args)
	},
	pause: async (args) => {
		const { kb, media, applyToMedia, show } = args
		if (kb.valueState === "off" || (kb.valueState === "toggle" && media.paused)) {
			show({ icons: ["play"] })
		} else {
			show({ icons: ["pause"] })
		}

		applyToMedia({ type: "PAUSE", state: kb.valueState })
	},
	mute: async (args) => {
		const { kb, media, applyToMedia, show } = args

		if (kb.valueState === "off" || (kb.valueState === "toggle" && media.muted)) {
			show({ text: `${Math.round(media.volume * 100)}%` })
		} else {
			show({ text: "0%" })
		}

		applyToMedia({ type: "MUTE", state: kb.valueState })
	},
	volume: async (args) => {
		return processAdjustMode(args)
	},
	setMark: async (args) => {
		const { kb, applyToMedia, show } = args
		let text = ` ${kb.valueString}`
		let icons: IndicatorShowOpts["icons"] = ["bookmark"]

		switch (kb.valueString?.toLowerCase()) {
			case "::nameless":
				text = " nameless"
				break
			case "::nameless-prev":
				text = " prev"
				icons = ["arrowLeft"]
				break
			case "::nameless-next":
				text = " next"
				icons = ["arrowRight"]
				break
		}

		show({
			icons,
			text,
			small: true,
		})
		applyToMedia({ type: "SET_MARK", key: kb.valueString })
	},
	seekMark: async (args) => {
		const { media, kb, applyToMedia, show } = args
		let hasMark = media.marks.includes(kb.valueString)
		let jumpTo: number

		if (!hasMark) {
			let key = `s:mark:${kb.valueString}:${await hashWithStoredSalt(media.domain, 6)}`
			const item = (await chrome.storage.session.get(key))[key] as SessionMark
			if (item) {
				if (Math.abs(media.duration - item.duration) < 2) {
					jumpTo = item.current
					hasMark = true
				}
			}
		}

		show({
			icons: hasMark ? ["arrowRight"] : ["bookmark"],
			text: ` ${kb.valueString}`,
			small: true,
		})
		applyToMedia({ type: "SEEK_MARK", key: jumpTo ?? kb.valueString })
	},
	loopEntire: async (args) => {
		const { media, kb, applyToMedia, show } = args

		let probe = (await chrome.tabs.sendMessage(media.tabInfo.tabId, { type: "MEDIA_PROBE", key: media.key } as Messages, {
			frameId: media.tabInfo.frameId || 0,
		})) as MediaProbe

		let on = (!probe.fullyLooped && kb.valueState === "toggle") || kb.valueState === "on"

		show({
			icons: ["loop"],
			text: ` ${on ? "on" : "off"}`,
			small: true,
		})
		applyToMedia({ type: "LOOP_ENTIRE", key: media.key, state: on ? "on" : "off" })
	},
	loop: async (args) => {
		const { media, kb, applyToMedia, show } = args
		if (media.marks.includes(kb.valueString)) {
			show({
				icons: ["loop"],
				text: ` ${media.inLoop ? "off" : "on"}`,
				small: true,
			})
			applyToMedia({ type: "TOGGLE_LOOP", key: kb.valueString, indicator: !args.shortcutHideIndicator, ignoreNavigate: kb.ignoreNavigate })
			return
		}

		show({
			icons: ["loop"],
			text: ` ${kb.valueString}???`,
			small: true,
		})
	},
	skip: async (args) => {
		const { media, kb, applyToMedia, show } = args
		if (media.marks.includes(kb.valueString)) {
			show({
				icons: ["skip"],
				text: ` ${media.inSkip ? "off" : "on"}`,
				small: true,
			})
			applyToMedia({
				type: "TOGGLE_LOOP",
				key: kb.valueString,
				skipMode: true,
				indicator: !args.shortcutHideIndicator,
				ignoreNavigate: kb.ignoreNavigate,
			})
			return
		}

		show({
			icons: ["skip"],
			text: ` ${kb.valueString}???`,
			small: true,
		})
	},
	fullscreen: async (args) => {
		const { kb, applyToMedia, media, tabInfo, fetch } = args

		// TODO: Seek clarification
		let captureMode = false

		if (chrome.offscreen && chrome.tabCapture && !media.fsMode) {
			const captured = await isTabCaptured(tabInfo.tabId)
			if (captured) {
				let view = await fetch({ audioFx: true, audioFxAlt: true })
				if (view.audioFx && (view.audioFx.pitch !== 0 || view.audioFx.volume !== 1 || view.audioFx.delay !== 0 || view.audioFx.eq.enabled)) {
					captureMode = true
					await releaseTabCapture(tabInfo.tabId)
					await timeout(100)
				}
			}
		}
		applyToMedia({ type: "FULLSCREEN", direct: kb.direct })

		if (captureMode) {
			await timeout(250)
			await initTabCapture(tabInfo.tabId)
		}
	},
	PiP: async (args) => {
		const { kb, applyToMedia } = args
		applyToMedia({ type: "PIP", state: kb.valueState })
	},
	cinema: async (args) => {
		const { kb, applyToMedia, media } = args
		const event = { type: "CINEMA", state: kb.valueState, init: kb.cinemaInit } as MediaEventCinema
		if (media.tabInfo.frameId > 0) {
			await chrome.tabs.sendMessage(media.tabInfo.tabId, { type: "CINEMA", event } as Messages, { frameId: 0 })
		}
		applyToMedia(event)
	},
	mediaInfo: async ({ applyToMedia }) => {
		applyToMedia({ type: "MEDIA_INFO" })
	},
	fxState: async (args) => {
		const { kb, fetch, override, show } = args
		let view = await fetch({ elementFx: true, backdropFx: true })

		const flags = intoFxFlags(kb.filterTarget)
		if (flags.element) {
			view.elementFx = view.elementFx ?? getDefaultFx()
			const enabled = kb.valueState === "on" || (kb.valueState === "toggle" && !view.elementFx.enabled)
			override.elementFx = { ...view.elementFx, enabled }
		}
		if (flags.backdrop) {
			view.backdropFx = view.backdropFx ?? getDefaultFx()
			const enabled = kb.valueState === "on" || (kb.valueState === "toggle" && !view.backdropFx.enabled)
			override.backdropFx = { ...view.backdropFx, enabled }
		}

		show({
			icons: ["power"],
		})
	},
	fxReset: async (args) => {
		const { kb, override } = args
		const flags = intoFxFlags(kb.filterTarget)
		if (flags.element) {
			override.elementFx = null
		}
		if (flags.backdrop) {
			override.backdropFx = null
		}
	},
	fxSwap: async (args) => {
		const { fetch, show, override } = args
		const view = await fetch({ backdropFx: true, elementFx: true })
		override.elementFx = view.backdropFx
		override.backdropFx = view.elementFx
		show({ icons: ["swap"] })
	},
	fxFilter: async (args) => {
		return processAdjustMode(args)
	},
	drawPage: async (args) => {
		const { tabInfo } = args
		if (!tabInfo) return
		chrome.scripting.executeScript({ target: { tabId: tabInfo.tabId, allFrames: false }, files: ["pageDraw.js"] })
	},
	afxPitch: async (args) => {
		return processAdjustMode(args)
	},
	afxGain: async (args) => {
		return processAdjustMode(args)
	},
	afxDelay: async (args) => {
		return processAdjustMode(args)
	},
	afxPan: async (args) => {
		return processAdjustMode(args)
	},
	afxMono: async (args) => {
		const { kb, fetch, show, override, autoCapture } = args

		const view = await fetch({ monoOutput: true })
		if (kb.valueState === "off" || (kb.valueState === "toggle" && view.monoOutput)) {
			override.monoOutput = false
		} else {
			override.monoOutput = true
		}
		override.monoOutput && autoCapture()
		show({
			text: ` ${override.monoOutput ? "on" : "off"}`,
		})
	},
	afxCapture: async (args) => {
		const { kb, show, tabInfo } = args
		if (!tabInfo) return

		let state = "off"

		const captured = await isTabCaptured(tabInfo.tabId)

		try {
			if (kb.valueState === "off") {
				releaseTabCapture(tabInfo.tabId)
			} else if (kb.valueState === "on") {
				initTabCapture(tabInfo.tabId)
				state = "on"
			} else {
				captured ? releaseTabCapture(tabInfo.tabId) : initTabCapture(tabInfo.tabId)
				state = captured ? "off" : "on"
			}
		} catch (err) {
			return
		}

		show({ text: state })
	},
	afxReset: async (args) => {
		const { show, tabInfo, override } = args
		if (!tabInfo) return

		const captured = await isTabCaptured(tabInfo.tabId)
		captured ? releaseTabCapture(tabInfo.tabId) : initTabCapture(tabInfo.tabId)
		override.audioFx = null
		override.audioFxAlt = override.audioPan = null
		show({ icons: ["reset"] })
	},
}

type SessionMark = {
	duration: number
	current: number
}

async function processAdjustMode(args: CommandHandlerArgs) {
	const { fetch, kb, commandInfo: command, show, media, applyToMedia, tabInfo } = args
	const adjustMode = kb.adjustMode || AdjustMode.SET

	if (adjustMode === AdjustMode.ITC) {
		const init = tabInfo && (await buildItcInit(kb))
		if (!init) return
		args.sendItcs([init])
		return
	}

	const ref = command.ref || command.getRef(command, kb)

	let value: number
	let isRelative = false

	if (adjustMode === AdjustMode.SET) {
		value = kb.valueNumber ?? ref.default
		if (kb.command === "speed") {
			let view = await fetch({ speed: true, lastSpeed: true })
			if (!kb.skipToggleSpeed && view.speed?.toFixed(2) === value.toFixed(2) && view.lastSpeed != null) {
				value = view.lastSpeed
			}
		}
	} else if (kb.adjustMode === AdjustMode.ADD) {
		value = kb.valueNumber ?? ref.step
		isRelative = true
	} else if (kb.adjustMode === AdjustMode.CYCLE) {
		value = await getCycle(args)
	}

	if (value == null || isNaN(value)) {
		throw Error("Value not NULL or NaN.")
	}

	let pretext: string = ""
	let text: string = ""
	let icons: IndicatorShowOpts["icons"] = []

	if (kb.command === "seek") {
		let valueContext = isRelative ? Math.abs(value) : value
		if (isRelative) {
			icons.push(value < 0 ? "arrowLeft" : "arrowRight")
		} else {
			pretext = "="
		}

		const frame = 1 / (media.fps ?? 24)
		const percent = media.duration / 100
		let seconds = value
		let isSmall = isSeekSmall(kb, ref)

		if (kb.duration === Duration.FRAMES) {
			seconds = value * frame
			text = ` ${round(valueContext, 2)}f`
		} else if (kb.duration === Duration.PERCENT) {
			seconds = value * percent
			text = ` ${round(valueContext, 0)}%`
		} else [(text = ` ${round(valueContext, 2)}`)]

		if (isRelative && kb.relativeToSpeed) {
			seconds *= media.playbackRate
		}

		if (kb.showNetDuration) {
			const now = Date.now()
			let net = 0
			if (lastSeek && lastSeek.key === media.key && lastSeek.time + 750 > now) {
				net = lastSeek.net
			}
			net += seconds
			lastSeek = { key: media.key, time: now, net }
			text = formatDuration(net, true)
			icons = []
		}

		applyToMedia({
			type: "SEEK",
			relative: isRelative,
			value: seconds,
			autoPause: isSmall ? !kb.skipPauseSmall : kb.autoPause,
			wraparound: kb.wraparound,
		})
		show({ text: text || "", icons: icons || [], preText: pretext || "" })
		return
	}

	let main: number
	let secondary: number

	// handle relative
	if (isRelative) {
		let values = await getValues(args)
		if (!values) return

		if ((values.secondary ?? values.main) != null) {
			main = value + (values.main ?? values.secondary)
			secondary = value + (values.secondary ?? values.main)
		}
	} else {
		main = secondary = value
	}

	// set value
	await setValue({
		kb,
		mediaKey: media?.key,
		mediaTabInfo: media?.tabInfo,
		tabInfo,
		value: main,
		valueAlt: secondary,
		shouldShow: !args.shortcutHideIndicator,
		ref,
	})
}

/** Everything a panel row needs. Also served to the page when a row switches command. */
export async function buildItcInit(kb: Keybind): Promise<ItcInit> {
	const command = commandInfos[kb.command]
	if (!command || !supportsItc(kb.command)) return
	const ref = command.ref || command.getRef(command, kb)
	const gsm = await loadGsm().catch(() => undefined as Gsm)

	return {
		kb,
		label: getItcLabel(kb, gsm),
		related: getItcRelated(kb, gsm),
		resetTo: ref.reset ?? ref.default,
		min: ref.min,
		max: ref.max,
		sliderMin: kb.valueItcMin ?? ref.itcMin ?? ref.sliderMin,
		sliderMax: kb.valueItcMax ?? ref.itcMax ?? ref.sliderMax,
		step: ref.sliderStep ?? ref.step,
	}
}

/**
 * The row's title. The content script has no gsm of its own, so resolve it here.
 * contextLabel is deliberately skipped: it's written for a menu entry, not for this.
 */
function getItcLabel(kb: Keybind, gsm?: Gsm) {
	if (kb.label) return kb.label
	if (!gsm) return ""
	if (kb.command === "fxFilter") return gsm.filter[kb.filterOption] || gsm.command.fxFilter
	return (gsm.command as { [key: string]: string })[kb.command] || ""
}

/**
 * What the row's name can be switched to: a filter stays within its own kind, so video
 * filters offer video filters and transforms offer transforms, and an audio effect offers
 * the other audio effects. The keybind's filter target rides along untouched, which is what
 * keeps a page filter row offering page filters.
 */
function getItcRelated(kb: Keybind, gsm?: Gsm): ItcRelated[] {
	if (!gsm) return []

	if (kb.command === "fxFilter") {
		const isTransform = !!filterInfos[kb.filterOption]?.isTransform
		return Object.keys(filterInfos)
			.filter((name) => !!filterInfos[name as FilterName].isTransform === isTransform)
			.map((name) => ({ key: name, label: gsm.filter[name as FilterName] || name }))
	}

	const group = commandInfos[kb.command].group
	if (group == null) return []
	return Object.keys(commandInfos)
		.filter((name) => commandInfos[name as CommandName].group === group && supportsItc(name as CommandName))
		.map((name) => ({ key: name, label: (gsm.command as { [key: string]: string })[name] || name }))
}

async function getCycle(args: CommandHandlerArgs) {
	const { fetch, override, kb, isAlt } = args
	const listKey = triggerToKey(kb.trigger)
	let keybinds = (await fetch({ [listKey]: true }))[listKey] || []

	if (!kb.valueCycle?.length) return null
	const cycleLength = kb.valueCycle.length
	let newIndex = (kb.cycleIncrement ?? 0) + (isAlt ? -1 : 1)
	if (!kb.cycleNoWrap) {
		if (newIndex < 0) {
			newIndex = cycleLength - 1
		} else if (newIndex >= cycleLength) {
			newIndex = 0
		}
	}
	newIndex = clamp(0, cycleLength - 1, newIndex)

	override[listKey] = produce(keybinds, (d) => {
		d.find((v) => v.id === kb.id).cycleIncrement = newIndex
	})

	return kb.valueCycle?.[newIndex]
}

const afxContinous = new Set(["afxPitch", "afxGain", "afxDelay", "afxPan"])

async function getValues(args: CommandHandlerArgs): Promise<{ main?: number; secondary?: number }> {
	const { kb, media, fetch, commandInfo } = args
	if (kb.command === "volume") {
		return { main: media.volume }
	}
	const selector = getItcSelector(kb)
	if (!Object.keys(selector).length) return
	return getItcValues(kb, await fetch(selector), commandInfo.ref || commandInfo.getRef?.(commandInfo, kb))
}

export type SetValueInit = {
	kb: Keybind
	value?: number
	valueAlt?: number
	tabInfo: TabInfo
	mediaKey?: string
	mediaTabInfo?: TabInfo
	shouldShow?: boolean
	ref?: ReferenceValues
}

export async function setValue(init: SetValueInit) {
	let { tabInfo, kb, mediaKey, mediaTabInfo, value, valueAlt, ref } = init
	if (value == null && valueAlt == null) return
	const command = commandInfos[kb.command]

	ref = ref || command.ref || command.getRef?.(command, kb)

	if (value != null) value = clamp(ref.min, ref.max, value)
	if (valueAlt != null) valueAlt = clamp(ref.min, ref.max, valueAlt)

	let override: StateView = {}

	if (kb.command === "speed") {
		override.lastSpeed = (await fetchView({ speed: true }, tabInfo.tabId)).speed
		if (override.lastSpeed === value) delete override.lastSpeed
		override.speed = value
	} else if (kb.command === "volume") {
		sendMediaEvent({ type: "SET_VOLUME", value, relative: false }, mediaKey, mediaTabInfo.tabId, mediaTabInfo.frameId)
	} else if (kb.command === "fxFilter") {
		const view = await fetchView({ elementFx: true, backdropFx: true }, init.tabInfo?.tabId)
		const { element, backdrop } = intoFxFlags(kb.filterTarget)
		const filterInfo = filterInfos[kb.filterOption]
		const star = filterInfo.isTransform ? "transforms" : "filters"
		if (element && value != null) {
			override.elementFx = produce(view.elementFx || getDefaultFx(), (d) => {
				d[star].find((f) => f.name === kb.filterOption).value = value
				if (value.toFixed(6) !== ref.default.toFixed(6)) d.enabled = true
			})
		}
		if (backdrop && valueAlt != null) {
			override.backdropFx = produce(view.backdropFx || getDefaultFx(), (d) => {
				d[star].find((f) => f.name === kb.filterOption).value = valueAlt
				if (valueAlt.toFixed(6) !== ref.default.toFixed(6)) d.enabled = true
			})
		}
	} else if (kb.command === "afxPan") {
		override.audioPan = value

		let command = commandInfos[kb.command]
		if (value?.toFixed(6) !== command.ref.default.toFixed(6)) initTabCapture(tabInfo.tabId)
	} else if (afxContinous.has(kb.command)) {
		const view = await fetchView({ audioFx: true, audioFxAlt: true }, tabInfo?.tabId)
		let command = commandInfos[kb.command]

		if (
			(value != null && value?.toFixed(6) !== command.ref.default.toFixed(6)) ||
			(valueAlt != null && valueAlt.toFixed(6) !== command.ref.default.toFixed(6))
		)
			initTabCapture(tabInfo.tabId)

		if (value != null) {
			override.audioFx = produce(view.audioFx ?? getDefaultAudioFx(), (d) => {
				d[afxContinuousMap[kb.command]] = value
			})
		}

		if (view.audioFxAlt && valueAlt != null) {
			override.audioFxAlt = produce(view.audioFxAlt, (d) => {
				d[afxContinuousMap[kb.command]] = valueAlt
			})
		}
	}

	if (Object.keys(override)) await pushView({ override, tabId: tabInfo.tabId })

	value = value ?? valueAlt

	let text = `${round(value, 2)}`
	let icons: IndicatorShowOpts["icons"] = []
	let preText: string = ""
	if (kb.command === "volume" || kb.command === "afxGain") {
		text = `${round(value * 100, 0)}%`
	} else if (kb.command === "speed") {
		if (!text.includes(".")) {
			text = `${text}.0`
		}
	}

	if (init.shouldShow && text.length + icons.length) {
		showIndicator({ text: text || "", icons: icons || [], preText }, tabInfo.tabId)
	}
}

function showIndicator(opts: IndicatorShowOpts, tabId: number) {
	sendMessageToConfigSync({ type: "SHOW_INDICATOR", opts }, tabId, 0)
}

let tempSpeedTimeoutId: number
let mediaSped: FlatMediaInfo

function sendTemporarySpeed(media: FlatMediaInfo, factor?: number) {
	const payload = (factor == null ? { type: "SET_TEMPORARY_SPEED" } : { type: "SET_TEMPORARY_SPEED", factor }) as Messages
	void sendToFrame(media.tabInfo.tabId, media.tabInfo.frameId, payload)
}

function activateTemporarySpeed(media: FlatMediaInfo, factor: number, kbType?: KeybindType) {
	sendTemporarySpeed(media, factor)
	if (mediaSped && mediaSped.key !== media?.key) {
		releaseTemporarySpeed(mediaSped)
	}
	mediaSped = media
	clearTimeout(tempSpeedTimeoutId)
	KeepAlive.start(2)

	tempSpeedTimeoutId = setTimeout(
		() => {
			releaseTemporarySpeed(media)
		},
		kbType === "pageKeybinds" ? 500 : 225,
	)
}

export function releaseTemporarySpeed(media?: FlatMediaInfo) {
	media = media || mediaSped
	if (!media) return
	sendTemporarySpeed(media)
	mediaSped = null
}
