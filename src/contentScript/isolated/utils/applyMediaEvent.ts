import { setSession } from "@/utils/browserUtils"
import { hashWithStoredSalt } from "@/utils/hash"
import { HAS_PIP_API } from "@/utils/supports"
import { CinemaInit, MediaProbe, StateOption } from "../../../types"
import { clamp, formatDuration, round } from "../../../utils/helper"
import { Cinema } from "./Cinema"
import { IS_AMAZON, IS_BILIBILI, IS_NATIVE, IS_NETFLIX, IS_SMART, IS_SPECIAL_SEEK, IS_YOUTUBE } from "./isWebsite"

export function getMediaProbe(media: HTMLMediaElement, includeFormatted?: boolean): MediaProbe {
	if (!media) return
	return {
		currentTime: media.currentTime,
		paused: media.paused,
		duration: media.duration,
		volume: media.volume,
		fps: media.tagName === "VIDEO" ? getFps(media as HTMLVideoElement) : null,
		formatted: includeFormatted ? getMediaInfo(media) : null,
		fullyLooped: media.loop,
	}
}

export function seek(elem: HTMLMediaElement, value: number, relative: boolean, fast?: boolean, autoPause?: boolean, wraparound?: boolean) {
	let newTime = value

	if (relative) {
		if (elem instanceof HTMLVideoElement && Math.abs(value).toFixed(4) === "0.0410") {
			if (elem.seekToNextFrame && value >= 0 && !IS_SPECIAL_SEEK) {
				elem.seekToNextFrame()
				return
			}

			const fps = getFps(elem)
			if (fps) {
				value = value >= 0 ? 1 / fps : -(1 / fps)
			}
		}

		newTime = elem.currentTime + value

		if (wraparound && elem.duration > 60) {
			if (newTime < 0) {
				const adjusted = (elem.duration - (Math.abs(newTime) % elem.duration)) % elem.duration
				newTime = adjusted
			} else if (newTime > elem.duration) {
				newTime = newTime % elem.duration
			}
		}
	}

	seekTo(elem, newTime, fast, autoPause)
}

export function seekTo(elem: HTMLMediaElement, value: number, fast?: boolean, autoPause?: boolean) {
	// fast seek is not precise for small changes.
	if (fast && (value < 10 || Math.abs(elem.currentTime - value) < 3)) {
		fast = false
	}

	const paused = elem.paused
	autoPause && elem.pause()

	if (IS_NETFLIX) {
		gvar.os.stratumServer.send({
			type: "SEEK_NETFLIX",
			value,
		})
		return
	}

	elem.currentTime = value

	if (IS_AMAZON && !autoPause) {
		paused ? elem.play() : elem.pause()
		paused ? elem.pause() : elem.play()
	}
}

export function setPause(elem: HTMLMediaElement, state: StateOption) {
	if (state === "on" || (state === "toggle" && !elem.paused)) {
		elem.pause()
	} else {
		elem.play()
	}
}

export function setMute(elem: HTMLMediaElement, state: StateOption) {
	elem.muted = state === "on" ? true : state === "off" ? false : !elem.muted
}

export function setVolume(elem: HTMLMediaElement, value: number, relative: boolean) {
	elem.volume = clamp(0, 1, relative ? elem.volume + value : value)
}

export function setMark(elem: HTMLMediaElement, key: string) {
	if (!elem.readyState) return

	elem.gsMarks = elem.gsMarks || {}
	elem.gsMarks[key] = elem.currentTime

	gvar.os.mediaTower.sendUpdate()
	persistMark(elem, key)
}

async function persistMark(elem: HTMLMediaElement, key: string) {
	let storageKey = `s:mark:${key}:${await hashWithStoredSalt(location.hostname, 6)}`
	let override = { [storageKey]: { duration: elem.duration, current: elem.currentTime } }
	setSession(override)
}

export function seekMark(elem: HTMLMediaElement, key: string | number, fast?: boolean) {
	const markTime = typeof key === "number" ? key : elem.gsMarks?.[key]
	if (markTime == null) {
		setMark(elem, key as string)
	} else {
		seekTo(elem, markTime, fast)
	}
}

function findNameless(arr: number[], currentTime: number, mode: "N" | "P" | "C") {
	let closest: { index: number; diff: number }

	arr.forEach((v, index) => {
		if (mode === "N" && v <= currentTime) return
		if (mode === "P" && v >= currentTime) return

		let diff = Math.abs(currentTime - v)
		if (!closest || diff < closest.diff) {
			closest = { index, diff }
		}
	})

	if (!closest) {
		if (mode === "N" && arr.length) {
			closest = { index: 0, diff: Math.abs(currentTime - arr[0]) }
		}
		if (mode === "P" && arr.length) {
			closest = { index: arr.length - 1, diff: Math.abs(currentTime - arr[arr.length - 1]) }
		}
	}
	return closest
}

function setNameless(elem: HTMLMediaElement) {
	elem.gsNameless = elem.gsNameless || []
	const nameless = elem.gsNameless

	// if any marks close enough, remove.
	const closest = findNameless(nameless, elem.currentTime, "C")
	if (closest?.diff <= 1) {
		nameless.splice(closest.index, 1)
		return
	}

	nameless.push(elem.currentTime)
}

function jumpNameless(elem: HTMLMediaElement, next?: boolean) {
	elem.gsNameless = elem.gsNameless || []
	let closest = findNameless(elem.gsNameless, elem.currentTime - (next ? 0 : 1), next ? "N" : "P")
	if (closest) {
		seekTo(elem, elem.gsNameless[closest.index])
	}
}

export function toggleLoop(elem: HTMLMediaElement, key: string, skipMode?: boolean, indicator?: boolean, ignoreNavigate?: boolean) {
	let markTime = elem.gsMarks?.[key]
	const timeUpdateKey = skipMode ? "gsSkipTimeUpdateHandler" : "gsLoopTimeUpdateHandler"
	const seekingKey = skipMode ? "gsSkipSeekingHandler" : "gsLoopSeekingHandler"
	const handleRemove = (noShow?: boolean) => {
		elem.removeEventListener("timeupdate", elem[timeUpdateKey], true)
		elem.removeEventListener("seeking", elem[seekingKey], true)
		delete elem[timeUpdateKey]
		delete elem[seekingKey]
		gvar.os.mediaTower.sendUpdate()

		if (!noShow && indicator) {
			gvar.os.indicator?.show({ text: " off", icons: [skipMode ? "skip" : "loop"] })
		}
	}

	if (elem[timeUpdateKey]) {
		handleRemove(true)
		return
	}

	if (markTime == null) {
		return
	}

	let endTime = elem.currentTime

	// make unidirectional
	if (markTime > endTime) {
		;[markTime, endTime] = [endTime, markTime]
	}
	const delta = Math.abs(endTime - markTime)

	elem[timeUpdateKey] = () => {
		if (!skipMode && (elem.currentTime > endTime || elem.currentTime < markTime)) {
			seekTo(elem, markTime)
		} else if (skipMode && elem.currentTime >= markTime && elem.currentTime < endTime) {
			if (elem.paused) return
			seekTo(elem, endTime)
		}
	}

	elem[seekingKey] = () => {
		if (!skipMode && (elem.currentTime < markTime - 12 || elem.currentTime > endTime + 12)) {
			handleRemove()
		} else if (skipMode && delta > 12 && elem.currentTime >= markTime + 4 && elem.currentTime < endTime - 4) {
			handleRemove()
		}
	}

	elem.addEventListener("timeupdate", elem[timeUpdateKey], { capture: true, passive: true })
	ignoreNavigate || elem.addEventListener("seeking", elem[seekingKey], { capture: true, passive: true })

	gvar.os.mediaTower.sendUpdate()
}

function toggleLoopEntire(elem: HTMLMediaElement, state: StateOption = "toggle") {
	elem.loop = (!elem.loop && state === "toggle") || state === "on"
}

function togglePip(elem: HTMLVideoElement, state: StateOption = "toggle") {
	if (!HAS_PIP_API) return
	let exit = state === "off"
	if (state === "toggle" && (elem.getRootNode() as any as DocumentOrShadowRoot).pictureInPictureElement === elem) {
		exit = true
	}

	if (exit) {
		document.exitPictureInPicture()
	} else {
		if (!elem.isConnected) return
		elem.removeAttribute("disablePictureInPicture")
		elem.requestPictureInPicture?.().catch((err) => {
			if (err?.name === "SecurityError" && err?.message.includes("permissions policy")) {
				alert("PiP blocking detected. To circumvent, try my 'PiP Unblocker' extension.")
			}
		})
	}
}

const RATE_LIMIT_PERIOD = 1000 * 20
const RATE_LIMIT = 1000
const RATE_LIMIT_MAX_VIOLATIONS = 3

class SetPlaybackRate {
	static checkLimited(elem: HTMLMediaElement) {
		if (!elem || elem.gsRateBanned) return true

		const time = Math.ceil(Date.now() / RATE_LIMIT_PERIOD) * RATE_LIMIT_PERIOD
		if (elem.gsRateCounter?.["time"] === time) {
			if (++elem.gsRateCounter["count"] > RATE_LIMIT) {
				elem.gsRateViolations = elem.gsRateViolations ?? 0
				if (++elem.gsRateViolations >= RATE_LIMIT_MAX_VIOLATIONS) {
					elem.gsRateBanned = true
				}
				delete elem.gsRateCounter
				return true
			}
		} else {
			elem.gsRateCounter = { time, count: 1 }
		}
		return false
	}
	static _set(elem: HTMLMediaElement, value: number, freePitch?: boolean) {
		if (SetPlaybackRate.checkLimited(elem)) return
		value = clamp(0.0625, 16, value)
		try {
			if (elem.playbackRate.toFixed(3) !== value.toFixed(3)) {
				elem.playbackRate = value
			}
		} catch (err) {}

		try {
			if (elem.defaultPlaybackRate.toFixed(3) !== value.toFixed(3)) {
				elem.defaultPlaybackRate = value
			}
		} catch (err) {}

		elem.preservesPitch = !freePitch
		elem.mozPreservesPitch = !freePitch
		elem.webkitPreservesPitch = !freePitch
	}
	static set = SetPlaybackRate._set
}

async function applyFullscreen(elem: HTMLVideoElement, native: boolean) {
	if (document.visibilityState === "hidden") return

	if (IS_BILIBILI && !native) {
		let control = document.querySelector(".bilibili-player-video-btn-fullscreen") as HTMLButtonElement
		if (control) {
			control.click()
			return
		}
	}
	if (IS_YOUTUBE && !native) {
		let control = document.querySelector(".ytp-fullscreen-button.ytp-button") as HTMLButtonElement
		if (control) {
			control.click()
			return
		}
	}

	if (IS_NATIVE && (native || !IS_SMART)) {
		gvar.os.nativeFs.toggleSafe(elem as HTMLVideoElement)
	} else if (IS_SMART && (!native || !IS_NATIVE)) {
		gvar.os.smartFs.toggleSafe(elem as HTMLVideoElement)
	}
}

export function applyCinema(elem: HTMLElement, e: MediaEventCinema) {
	if (!gvar.isTopFrame) {
		if (window.top === window.parent) window.top.postMessage("CINEMA", "*")
		return
	}
	if (e.state === "off" || (e.state === "toggle" && Cinema.currentCinema)) {
		Cinema.currentCinema?.release()
		delete Cinema.currentCinema
	} else {
		new Cinema(elem, e.init)
	}
}

function getFps(elem: HTMLVideoElement) {
	if (elem.gsFpsCount > 5) {
		let fps = elem.gsFpsSum / elem.gsFpsCount
		if (fps > 0) return fps
	}
}

function getGcd(a: number, b: number) {
	if (b === 0) return a
	return getGcd(b, a % b)
}

function getAspect(width: number, height: number) {
	const gcd = getGcd(width, height)
	const aspect = [width / gcd, height / gcd]
	if (aspect[0] <= 0.2 * width || aspect[1] <= 0.2 * height) {
		return aspect
	}
}

export function getFormattedAspect(elem: HTMLVideoElement) {
	if (elem.videoWidth && elem.videoHeight) {
		const aspect = getAspect(elem.videoWidth, elem.videoHeight).join(" x ")
		let res = `${elem.videoWidth} x ${elem.videoHeight}`
		if (aspect) res = `${res} ${getAspect(elem.videoWidth, elem.videoHeight).join(":")}`
		return res
	}
}

function getMediaInfo(elem: HTMLMediaElement) {
	const lines = []
	if (elem instanceof HTMLVideoElement) {
		let res = getFormattedAspect(elem) || ""

		let fps = getFps(elem)
		if (fps) res = `${res} (~${fps.toFixed(0)} FPS)`
		lines.push(res)
	}
	let dur = `${formatDuration(elem.currentTime)} / ${elem.duration === Infinity ? "∞" : formatDuration(elem.duration)}`
	if (elem.playbackRate !== 1) {
		dur = `${dur} → ${formatDuration(elem.currentTime / elem.playbackRate)} / ${formatDuration(elem.duration / elem.playbackRate)}`
	}
	lines.push(dur)
	lines.push(`Speed: ${round(elem.playbackRate, 2)}x, Volume: ${(elem.volume * 100).toFixed(0)}%${elem.muted ? " (Muted)" : ""}`)
	return lines.join("\n")
}

function showMediaInfo(elem: HTMLMediaElement) {
	gvar.os.indicator.show({
		text: getMediaInfo(elem),
		duration: 5000,
		static: true,
		fontSize: "20px",
	})
}

export function applyMediaEvent(elem: HTMLMediaElement, e: MediaEvent) {
	if (e.type === "CINEMA") {
		applyCinema(elem as HTMLVideoElement, e)
		return
	}

	if (!elem?.duration) return
	if (e.type === "PLAYBACK_RATE") {
		SetPlaybackRate.set(elem, e.value, e.freePitch)
	} else if (e.type === "SEEK") {
		seek(elem, e.value, e.relative, e.fast, e.autoPause, e.wraparound)
	} else if (e.type === "PAUSE") {
		setPause(elem, e.state)
	} else if (e.type === "MUTE") {
		setMute(elem, e.state)
	} else if (e.type === "SET_VOLUME") {
		setVolume(elem, e.value, e.relative)
	} else if (e.type === "SET_MARK") {
		let lowerCaseKey = (e.key || "").toLowerCase()
		if (e.key === "::nameless") {
			setNameless(elem)
		} else if (lowerCaseKey === "::nameless-prev") {
			jumpNameless(elem)
		} else if (lowerCaseKey === "::nameless-next") {
			jumpNameless(elem, true)
		} else {
			setMark(elem, e.key)
		}
	} else if (e.type === "SEEK_MARK") {
		seekMark(elem, e.key, e.fast)
	} else if (e.type === "TOGGLE_LOOP") {
		toggleLoop(elem, e.key, e.skipMode, e.indicator, e.ignoreNavigate)
	} else if (e.type === "PIP") {
		togglePip(elem as HTMLVideoElement, e.state)
	} else if (e.type === "FULLSCREEN") {
		applyFullscreen(elem as HTMLVideoElement, e.direct)
	} else if (e.type === "MEDIA_INFO") {
		showMediaInfo(elem)
	} else if (e.type === "LOOP_ENTIRE") {
		toggleLoopEntire(elem, e.state)
	}
}

export function realizeMediaEvent(key: string, e: MediaEvent) {
	if (key) {
		const elem = [...gvar.os.mediaTower.media].find((elem) => elem.gsKey === key)
		if (elem) {
			applyMediaEvent(elem, e)
		}
	} else {
		gvar.os.mediaTower.media.forEach((elem) => {
			applyMediaEvent(elem, e)
		})
	}
}

export function requestApplyMediaEvent(tabId: number, frameId: number, key: string, event: MediaEvent) {
	if ((frameId || 0) === (gvar.tabInfo?.frameId || 0) && tabId && tabId === gvar.tabInfo?.tabId) {
		if (!gvar.os) return
		const elem = [...gvar.os.mediaTower.media].find((elem) => elem.gsKey === key)
		if (elem) applyMediaEvent(elem, event)
	} else {
		chrome.runtime.sendMessage({ type: "SEND_MEDIA_EVENT_TO", key, tabId, frameId, event } as Messages)
	}
}

export type MediaEventPlaybackRate = { type: "PLAYBACK_RATE"; value: number; freePitch: boolean }
export type MediaEventSeek = { type: "SEEK"; value: number; relative?: boolean; fast?: boolean; autoPause?: boolean; wraparound?: boolean }
export type MediaEventPause = { type: "PAUSE"; state: StateOption }
export type MediaEventMute = { type: "MUTE"; state: StateOption }
export type MediaEventSetVolume = { type: "SET_VOLUME"; value: number; relative: boolean }
export type MediaEventSetMark = { type: "SET_MARK"; key: string }
export type MediaEventSeekMark = { type: "SEEK_MARK"; key: string | number; fast: boolean }
export type MediaEventToggleLoop = { type: "TOGGLE_LOOP"; key: string; skipMode?: boolean; indicator?: boolean; ignoreNavigate?: boolean }
export type MediaEventLoopEntire = { type: "LOOP_ENTIRE"; key: string; state: StateOption }
export type MediaEventTogglePip = { type: "PIP"; state?: StateOption }
export type MediaEventToggleFs = { type: "FULLSCREEN"; direct?: boolean }
export type MediaEventShowInfo = { type: "MEDIA_INFO" }
export type MediaEventCinema = { type: "CINEMA"; init: CinemaInit; state?: StateOption }

export type MediaEvent =
	| MediaEventPlaybackRate
	| MediaEventSeek
	| MediaEventPause
	| MediaEventMute
	| MediaEventSetVolume
	| MediaEventSetMark
	| MediaEventSeekMark
	| MediaEventToggleLoop
	| MediaEventTogglePip
	| MediaEventToggleFs
	| MediaEventShowInfo
	| MediaEventCinema
	| MediaEventLoopEntire
