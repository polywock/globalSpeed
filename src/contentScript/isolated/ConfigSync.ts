import { getEmptyUrlConditions } from "@/defaults"
import { DEFAULT_LONG_PRESS_THRESHOLD } from "@/defaults/constants"
import { AdjustMode, Keybind, KeybindMatch, URLCondition, URLConditionPart } from "@/types"
import { getPracticalRuntimeUrl } from "@/utils/helper"
import { getLeaf } from "@/utils/nativeUtils"
import { getActiveParts, hasActiveParts, testURL, testURLWithPart } from "../../utils/configUtils"
import { compareHotkeys, extractHotkey, Hotkey } from "../../utils/keys"
import { SubscribeView } from "../../utils/state"
import { FxSync } from "./FxSync"
import { Circle } from "./utils/Circle"

const ghostModeStatic = [
	".qq.com",
	"wetv.vip",
	"web.whatsapp.com",
	"pan.baidu.com",
	"onedrive.live.com",
	"open.spotify.com",
	".instagram.com",
	".descript.com",
	"www.ccmtv.cn",
	".douyin.com",
	".tiktok.com",
	".linkedin.com",
	"mooc1.chaoxing.com",
].some((site) => (location.hostname || "").includes(site))

export class ConfigSync {
	ac = new AbortController()
	released = false
	blockKeyUp = false
	fastForwardHeld: FastForwardHeld | undefined = undefined
	lastTrigger = 0
	heldKeys: Map<string, LongPressState> = new Map()
	fxSync: FxSync
	urlConditionsClient = new SubscribeView(
		{ keybindsUrlCondition: true },
		gvar.tabInfo.tabId,
		true,
		(v, onLaunch) => {
			this.handleChangeUrlConditionsList()
		},
		300,
	)
	client = new SubscribeView(
		{
			ghostMode: true,
			ghostModeUrlCondition: true,
			enabled: true,
			superDisable: true,
			latestViaShortcut: true,
			pageKeybinds: true,
			indicatorInit: true,
			circleWidget: true,
			circleInit: true,
			holdToSpeed: true,
			longPressThreshold: true,
		},
		gvar.tabInfo.tabId,
		true,
		(v, onLaunch) => {
			if (onLaunch) this.init()
			this.handleChange()
		},
		300,
	)
	speedClient = new SubscribeView(
		{ speed: true, freePitch: true, enabled: true, superDisable: true },
		gvar.tabInfo.tabId,
		true,
		(v) => {
			this.handleSpeedChange()
		},
		100,
		150,
	)
	ignoreList = new Set<string>()
	init = () => {
		gvar.os.eListen.keyDownCbs.add(this.handleKeyDown, this.ac.signal)
		gvar.os.eListen.keyUpCbs.add(this.handleKeyUp, this.ac.signal)
		gvar.os.eListen.visibilityCbs.add(() => document.hidden && this.handleBlur(), this.ac.signal)
		gvar.os.eListen.blurCbs.add(this.handleBlur, this.ac.signal)
		this.handleSpeedChange()
	}
	release = () => {
		if (this.released) return
		this.ac.abort()
		this.released = true
		this.handleBlur()
		this.urlConditionsClient?.release()
		delete this.urlConditionsClient
		this.client?.release()
		delete this.client
		this.speedClient?.release()
		delete this.speedClient
		this.fxSync?.release()
		delete this.fxSync
	}
	handleBlur = () => {
		this.heldKeys.forEach((state) => clearTimeout(state.timerId))
		this.heldKeys.clear()
		if (this.fastForwardHeld) {
			this.fastForwardHeld = undefined
			chrome.runtime.sendMessage({ type: "RELEASED_TEMPORARY_SPEED" })
		}
	}
	urlConditions: URLCondition
	urlConditionsMode: "Off" | "On" | "Runtime" = "Off"
	urlConditionsNonStatic: URLConditionPart[] = []
	handleChangeUrlConditionsList = () => {
		this.urlConditions = this.urlConditionsClient.view.keybindsUrlCondition || getEmptyUrlConditions(true)
		const enabledParts = getActiveParts(this.urlConditions)
		const runtimeUrl = getPracticalRuntimeUrl()

		if (enabledParts.length === 0) {
			this.urlConditionsMode = "On"
			return
		}

		let statics: URLConditionPart[] = []
		let nonStatics: URLConditionPart[] = []

		enabledParts.forEach((part) => {
			;(websiteCanBeStaticTested(part, runtimeUrl) ? statics : nonStatics).push(part)
		})

		this.urlConditionsNonStatic = nonStatics

		// All statics should be dealt with.

		if (statics.length === 0) {
			this.urlConditionsMode = "Runtime"
			return
		}
		const anyMatched = statics.some((st) => testURLWithPart(runtimeUrl, st))
		if (!anyMatched) {
			this.urlConditionsMode = "Runtime"
		} else {
			this.urlConditionsMode = this.urlConditions.block ? "Off" : "On"
		}

		// Resolve 'Runtime' instantly if no dynamic parts.
		if (this.urlConditionsMode === "Runtime" && nonStatics.length === 0) {
			this.urlConditionsMode = this.urlConditions.block ? "On" : "Off"
		}
	}
	checkUrlRuntime = () => {
		if (this.urlConditionsMode !== "Runtime") return this.urlConditionsMode
		const url = getPracticalRuntimeUrl()
		const anyMatched = this.urlConditionsNonStatic.some((st) => testURLWithPart(url, st))
		if (this.urlConditions.block) return anyMatched ? "Off" : "On"
		return anyMatched ? "On" : "Off"
	}
	handleChange = () => {
		const view = this.client.view
		const enabled = view?.enabled && !view.superDisable

		if (gvar.os.indicator && gvar.os.indicator.key !== view?.indicatorInit?.key) {
			gvar.os.indicator.setInit(view?.indicatorInit || {})
		}

		gvar.os.speedSync.holdToSpeed = view.holdToSpeed

		if (enabled) {
			this.fxSync = this.fxSync ?? new FxSync()
		} else {
			this.fxSync?.release()
			delete this.fxSync
		}

		if (enabled && view.circleWidget) {
			// Update when settings change.
			if (gvar.os.circle && gvar.os.circle.key !== view.circleInit?.key) {
				gvar.os.circle?.release()
				delete gvar.os.circle
			}

			gvar.os.circle = gvar.os.circle || new Circle(view.circleInit)
		} else {
			gvar.os.circle?.release()
			delete gvar.os.circle
		}

		// Ghost mode
		let calcGhostMode = false
		if (view?.ghostMode && testURL(getPracticalRuntimeUrl(), view.ghostModeUrlCondition, true)) {
			calcGhostMode = true
		}

		if (view?.enabled && (calcGhostMode || ghostModeStatic)) {
			if (!gvar.ghostMode) {
				gvar.ghostMode = true
				gvar.os.stratumServer.initialized ? this.sendGhostOn() : gvar.os.stratumServer.initCbs.add(this.sendGhostOn)
			}
		} else {
			if (gvar.ghostMode) {
				gvar.ghostMode = false
				gvar.os.stratumServer.initialized ? this.sendGhostOff() : gvar.os.stratumServer.initCbs.add(this.sendGhostOff)
			}
		}
	}
	handleSpeedChange = () => {
		const speedView = this.speedClient.view

		if (speedView && speedView.enabled && !speedView.superDisable) {
			gvar.os.speedSync.latest = { speed: speedView.speed, freePitch: speedView.freePitch }
			gvar.os.speedSync.update()
		} else {
			delete gvar.os.speedSync.latest
			gvar.os.speedSync.update()
		}
	}
	sendGhostOn = () => gvar.os.stratumServer.send({ type: "GHOST" })
	sendGhostOff = () => gvar.os.stratumServer.send({ type: "GHOST", off: true })
	sendBgHideOn = () => gvar.os.stratumServer.send({ type: "BG_HIDE" })
	sendBgHideOff = () => gvar.os.stratumServer.send({ type: "BG_HIDE", off: true })
	handleKeyUp = (e: KeyboardEvent) => {
		this.lastTrigger = 0
		this.ignoreList.clear()
		if (this.blockKeyUp) {
			this.blockKeyUp = false
			e.stopImmediatePropagation()
			e.preventDefault()
		}

		const heldState = this.heldKeys.get(e.code)
		if (heldState) {
			clearTimeout(heldState.timerId)
			this.heldKeys.delete(e.code)
		}

		// Release fast forward on key up
		if (this.fastForwardHeld && (this.fastForwardHeld.code === e.code || !this.fastForwardHeld.code)) {
			this.fastForwardHeld = undefined
			chrome.runtime.sendMessage({ type: "RELEASED_TEMPORARY_SPEED" })
		}
	}
	handleKeyDown = (e: KeyboardEvent) => {
		if (document.activeElement?.tagName === "IFRAME") return
		if (!chrome.runtime?.id) return gvar.os.handleOrphan()
		if (!this.client?.view) return
		if (this.client.view.superDisable) return

		const enabled = this.client.view.enabled

		let keybinds = this.client.view.pageKeybinds
		if (!enabled) {
			keybinds = (keybinds || []).filter((kb) => kb.command === "state" && kb.enabled && (this.client.view.latestViaShortcut || kb.alwaysOn))
			if (!keybinds.length) return
		}

		this.blockKeyUp = false

		// stop if input fields
		const target = e.target as HTMLElement
		if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable || document.pointerLockElement) {
			return
		}

		const active = getLeaf(document, "activeElement")
		if (target !== active) {
			if (["INPUT", "TEXTAREA"].includes(active.tagName) || (active as HTMLElement).isContentEditable) {
				return
			}
		}

		if (this.checkUrlRuntime() === "Off") return

		// Get triggered keybinds
		const eventHotkey = extractHotkey(e, true, true)
		let matches = findMatchingPageKeybinds(keybinds, eventHotkey)

		// Filter by any URL conditions
		matches = matches.filter((match) => {
			if (match.kb.condition && hasActiveParts(match.kb.condition)) {
				return testURL(getPracticalRuntimeUrl(), match.kb.condition, true)
			}
			return true
		})

		// If greedy, stop propagation.
		const greedy = matches.some((v) => v.kb.greedy)
		if (greedy) {
			this.blockKeyUp = true
			e.preventDefault()
			e.stopImmediatePropagation()
		}

		// Split matches by press type
		const shortMatches = matches.filter((m) => !m.kb.longPress)
		const longMatches = matches.filter((m) => m.kb.longPress)

		// If no long press matches, use normal behavior
		if (!longMatches.length) {
			this.triggerMatches(shortMatches, e)
			return
		}

		// If any long press keybinds present, require an anchor .code
		const heldKeyId = eventHotkey.code
		if (!heldKeyId) return

		let held = this.heldKeys.get(heldKeyId)
		if (!held) {
			// If first time pressing it, note
			held = {
				longMatches: longMatches,
			}
			held.timerId = window.setTimeout(() => {
				// Trigger long matches after timeout
				this.triggerMatches(longMatches)
				held.reached = true
			}, this.client?.view?.longPressThreshold ?? DEFAULT_LONG_PRESS_THRESHOLD)

			this.heldKeys.set(heldKeyId, held)

			// Trigger short matches first time only
			if (shortMatches.length) {
				this.triggerMatches(shortMatches, e)
				return
			}
		} else {
			// If already held down for enough time, trigger long matches repeatedly
			if (held.reached) {
				this.triggerMatches(longMatches, e)
			}
		}
	}

	triggerMatches = (matches: KeybindMatch[], e?: KeyboardEvent) => {
		// Avoid repeat keybinds in ignoredList
		matches = matches.filter((match) => !this.ignoreList.has(match.kb.id))
		if (!matches.length) return

		// A minimum interval between shortcuts
		const now = Date.now()
		if (now - this.lastTrigger <= 50) return
		this.lastTrigger = now

		// Add certain keybinds to ignore list to avoid repeat triggering
		matches
			.filter((match) => match.kb.adjustMode === AdjustMode.ITC || match.kb.adjustMode === AdjustMode.ITC_REL)
			.forEach((v) => this.ignoreList.add(v.kb.id))

		// Trigger the keybinds
		chrome.runtime.sendMessage({ type: "TRIGGER_KEYBINDS", ids: matches.map((match) => ({ id: match.kb.id, alt: match.alt })) })

		// Also track
		if (matches.some((match) => match.kb.command === "temporarySpeed")) {
			this.fastForwardHeld = { code: e?.code }
		}
	}
}

function websiteCanBeStaticTested(entry: URLConditionPart, runtimeUrl: string) {
	const value = (entry.valueStartsWith || "").trim()
	if (entry.type === "STARTS_WITH" && value.startsWith("http")) {
		if (!gvar.isTopFrame && !gvar.topFrameUrl) return false
		const count = [...value].filter((ch) => ch === "/").length
		if (count === 2) return true
		if (count === 3 && value.endsWith("/")) return true
		const origin = safeGetOrigin(runtimeUrl) || location.origin || ""
		if (!value.startsWith(origin)) return true
	}
}

function safeGetOrigin(url: string) {
	try {
		return new URL(url).origin
	} catch (err) {}
}

function findMatchingPageKeybinds(kbs: Keybind[], key?: Hotkey): KeybindMatch[] {
	return kbs
		.filter((kb) => kb.enabled)
		.map((kb) => {
			if (kb.key && compareHotkeys(kb.key, key)) return { kb }
			if (kb.allowAlt && kb.adjustMode === AdjustMode.CYCLE && compareHotkeys(kb.keyAlt, key)) return { kb, alt: true }
		})
		.filter((v) => v)
}

type FastForwardHeld = {
	code: string
}

type LongPressState = {
	longMatches: KeybindMatch[]
	timerId?: ReturnType<typeof setTimeout>
	reached?: boolean
}
