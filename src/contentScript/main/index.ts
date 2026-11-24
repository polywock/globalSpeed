import { IS_FIREFOX_BUILD } from "../../utils/buildFlags"
import { randomId } from "../../utils/helper"
import { IS_DOUYIN } from "../isolated/utils/siteAdapters/douyin"
import { IS_YOUTUBE } from "../isolated/utils/siteAdapters/youtube"
import { readDouyinTimeline, seekDouyin } from "./utils/DouyinSeek"
import { DouyinSpeed } from "./utils/DouyinSpeed"
import { native } from "./utils/nativeCodes"
import { seekNetflix } from "./utils/seekNetflix"
import { YoutubeCaptions } from "./utils/YoutubeCaptions"
import { YoutubeLive } from "./utils/YoutubeLive"

declare global {
	interface Window {
		loadedGsCtx: boolean
	}
}

// Ghost Mode iterates the media it has seen. The sets make the per-call duplicate checks constant time;
// pages can attach thousands of shadow roots, and a weak set doesn't keep them alive either.
let mediaReferences: HTMLMediaElement[] = []
const seenMedia: WeakSet<HTMLMediaElement> = new native.WeakSet()
const seenShadowRoots: WeakSet<ShadowRoot> = new native.WeakSet()
let client: StratumClient
let ghostMode: GhostMode
let douyinSpeed: DouyinSpeed
let youtubeCaptions: YoutubeCaptions
let youtubeLive: YoutubeLive

function main() {
	if (IS_FIREFOX_BUILD) {
		if (window.loadedGsCtx) return
		window.loadedGsCtx = true

		ensureSoundcloud()
	}
	ensureBaidu()

	ghostMode = new GhostMode()
	client = new StratumClient()

	overridePrototypeMethod(HTMLMediaElement, "play", handleOverrideMedia)
	overridePrototypeMethod(HTMLMediaElement, "pause", handleOverrideMedia)
	overridePrototypeMethod(HTMLMediaElement, "load", handleOverrideMedia)
	overridePrototypeMethod(Element, "attachShadow", handleOverrideShadow)
}

function overridePrototypeMethod(type: any, methodName: string, eventCb: (args: any, _this: any, _return: any) => void) {
	const ogFunc = type?.prototype[methodName]
	if (!ogFunc) return
	const ogString = ogFunc.toString()
	type.prototype[methodName] = function (...args: any[]) {
		const _return = ogFunc.apply(this, args)
		eventCb(args, this, _return)
		return _return
	}

	// For amazon music's sake.
	type.prototype[methodName].toString = () => ogString
}

function handleOverrideMedia(args: any, _this: HTMLMediaElement, _return: any) {
	if (!(_this instanceof native.HTMLMediaElement)) return
	if (native.weakSet.has.call(seenMedia, _this)) return
	native.weakSet.add.call(seenMedia, _this)
	native.array.push.call(mediaReferences, _this)
	client.wiggleOn(_this)
}

function handleOverrideShadow(args: [ShadowRootInit], _this: Element, _return: ShadowRoot) {
	if (!(_return instanceof native.ShadowRoot)) return
	if (native.weakSet.has.call(seenShadowRoots, _return)) return
	native.weakSet.add.call(seenShadowRoots, _return)
	client.wiggleOn(_return)
}

// soundcloud support for Firefox (may remove later)
function ensureSoundcloud() {
	if (!location.hostname.includes("soundcloud.com")) return

	const og = AudioContext.prototype.createMediaElementSource
	AudioContext.prototype.createMediaElementSource = function (...args) {
		const out = og.apply(this, [document.createElement("audio")])
		return out
	}
}

function ensureBaidu() {
	return
	if (!location.hostname.includes("pan.baidu.com")) return
	let ua = navigator.userAgent

	ua = ua.replace("Windows NT", "Windоws NT")
	ua = ua.replace("Macintosh", "Macintоsh")
	ua = ua.replace("Chrome", "Chrоme")
	ua = ua.replace("Firefox", "Firefоx")
	ua = ua.replace("Edg", "Eԁg")
	ua = ua.replace("Safari", "Sаfari")

	const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, "userAgent")
	Object.defineProperty(Navigator.prototype, "userAgent", {
		...desc,
		get: function () {
			return ua
		},
	})
}

class GhostMode {
	active = false
	tempTimeout?: number
	dummyAudio = new Audio()
	ogDesc = {
		playbackRate: Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "playbackRate"),
		defaultPlaybackRate: Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "defaultPlaybackRate"),
	}
	coherence = {
		playbackRate: new Map<HTMLMediaElement, number>(),
		defaultPlaybackRate: new Map<HTMLMediaElement, number>(),
	}
	constructor() {
		for (let key of ["playbackRate", "defaultPlaybackRate"] as ("playbackRate" | "defaultPlaybackRate")[]) {
			const ogDesc = this.ogDesc[key]
			let coherence = this.coherence[key]
			const self = this

			try {
				Object.defineProperty(HTMLMediaElement.prototype, key, {
					configurable: true,
					enumerable: true,
					get: function () {
						self.ogDesc[key].get.call(this)
						return self.active ? (native.map.has.call(coherence, this) ? native.map.get.call(coherence, this) : 1) : ogDesc.get.call(this)
					},
					set: function (newValue) {
						if (self.active && !(this instanceof native.HTMLMediaElement)) {
							self.ogDesc[key].set.call(this, newValue)
						}
						try {
							let output = ogDesc.set.call(self.active ? self.dummyAudio : this, newValue)
							let rate = ogDesc.get.call(self.active ? self.dummyAudio : this)
							native.map.set.call(coherence, this, rate)
							return output
						} catch (err) {
							throw err
						}
					},
				})
			} catch (err) {}
		}
	}
	activate = () => {
		if (this.tempTimeout) {
			clearTimeout(this.tempTimeout)
			delete this.tempTimeout
		}
		if (this.active) return
		this.active = true

		native.map.clear.call(this.coherence.playbackRate)
		native.map.clear.call(this.coherence.defaultPlaybackRate)

		mediaReferences.forEach((m) => {
			native.map.set.call(this.coherence.playbackRate, m, this.ogDesc.playbackRate.get.call(m))
			native.map.set.call(this.coherence.defaultPlaybackRate, m, this.ogDesc.defaultPlaybackRate.get.call(m))
		})
	}
	deactivate = () => {
		if (this.tempTimeout) {
			clearTimeout(this.tempTimeout)
			delete this.tempTimeout
		}
		if (!this.active) return
		this.active = false
	}
	activateFor = (ms: number) => {
		if (this.active) return
		this.activate()
		this.tempTimeout = window.setTimeout(this.deactivate, ms)
	}
}

class StratumClient {
	#parasite = document.createElement("div")
	#parasiteRoot = this.#parasite.attachShadow({ mode: "open" })
	#key = randomId()
	#serverName = `GS_SERVER_${this.#key}`
	#clientName = `GS_CLIENT_${this.#key}`

	constructor() {
		this.#parasite.id = "GS_PARASITE"
		this.#parasiteRoot.addEventListener(this.#clientName, this.handle, { capture: true })
		document.documentElement.appendChild(this.#parasite)
		this.#parasite.dispatchEvent(new CustomEvent("GS_INIT", { detail: this.#key }))
		this.#parasite.remove()
	}
	handle = (e: CustomEvent) => {
		native.stopImmediatePropagation.call(e)
		let data: any
		try {
			e.detail && (data = native.JSON.parse(e.detail))
		} catch (err) {}

		if (!data) return

		if (data.type === "SEEK_NETFLIX") {
			seekNetflix(data.value)
		} else if (data.type === "GHOST") {
			data.off ? ghostMode.deactivate() : ghostMode.activate()
		} else if (data.type === "DOUYIN_SPEED" && IS_DOUYIN) {
			douyinSpeed = douyinSpeed || new DouyinSpeed()
			douyinSpeed.update(data.speed)
		} else if (data.type === "DOUYIN_SEEK" && IS_DOUYIN) {
			seekDouyin(data.index, data.value, data.relative, data.autoPause, data.wraparound)
		} else if (data.type === "DOUYIN_TIME" && IS_DOUYIN) {
			this.send({ type: "DOUYIN_TIME", index: data.index, timeline: readDouyinTimeline(data.index) })
		} else if (data.type === "YOUTUBE_SYNC" && IS_YOUTUBE) {
			// Read the saved native getter even when Ghost Mode spoofs the page's rate.
			youtubeCaptions = youtubeCaptions || new YoutubeCaptions((video) => ghostMode.ogDesc.playbackRate.get.call(video))
			youtubeCaptions.update(data.enabled === true)
			youtubeLive = youtubeLive || new YoutubeLive((value) => this.send({ type: "YOUTUBE_LIVE", value }))
			youtubeLive.update(data.enabled === true)
		}
	}
	send = (data: any) => {
		native.dispatchEvent.call(
			this.#parasiteRoot,
			new native.CustomEvent(this.#serverName, { detail: native.JSON.stringify({ type: "MSG", data }) }),
		)
	}
	wiggleOn = (parent: HTMLElement | ShadowRoot) => {
		native.appendChild.call(parent, this.#parasite)
		native.dispatchEvent.call(this.#parasiteRoot, new native.CustomEvent(this.#serverName, { detail: native.JSON.stringify({ type: "WIGGLE" }) }))
		native.elementRemove.call(this.#parasite)
	}
}

main()
