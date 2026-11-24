import { gvar } from "@/globalVar"
import { conformSpeed } from "@/utils/configUtils"
import { between } from "@/utils/helper"
import { SubscribeView } from "@/utils/state"
import { DouyinSpeedMessage, IS_DOUYIN } from "./utils/siteAdapters/douyin"
import { IS_YOUTUBE, YoutubeLiveMessage, YoutubeSyncMessage } from "./utils/siteAdapters/youtube"

export class SpeedSync {
	intervalId: number
	latest: { freePitch: boolean; speed: number }
	holdToSpeed: number
	holdToSpeedForKeyboard: number
	speedClient?: SubscribeView
	pointerDownAt: number
	keyDownAt: number
	private douyinSpeed: number | null = null
	private youtubeSyncEnabled = false
	/** The speed last synced to YouTube's captions, or null when the sync is off. */
	private youtubeSyncedSpeed: number | null | undefined
	constructor() {
		window.addEventListener("pointerdown", this.handlePointerDown, { capture: true, passive: true })
		window.addEventListener("pointerup", this.handlePointerUp, { capture: true, passive: true })
		window.addEventListener("pointercancel", this.handlePointerCancel, { capture: true, passive: true })
		document.addEventListener("pointerleave", this.clearPointerDown, { capture: true, passive: true })
		window.addEventListener("keyup", this.handleKeyUp, { capture: true })
		IS_YOUTUBE && gvar.os.stratumServer.msgCbs.add(this.handleServerMessage)
	}
	release = () => {
		delete this.latest
		this.syncDouyinSpeed(null)
		this.syncYoutube(false)
		gvar.os.stratumServer.initCbs.delete(this.sendDouyinSpeed)
		gvar.os.stratumServer.initCbs.delete(this.sendYoutubeSync)
		IS_YOUTUBE && gvar.os.stratumServer.msgCbs.delete(this.handleServerMessage)
		gvar.os.mediaTower.forceSpeedCallbacks.delete(this.realize)
		clearInterval(this.intervalId)
		delete this.intervalId
		window.removeEventListener("pointerdown", this.handlePointerDown, true)
		window.removeEventListener("pointerup", this.handlePointerUp, true)
		window.removeEventListener("pointercancel", this.handlePointerCancel, true)
		document.removeEventListener("pointerleave", this.clearPointerDown, true)
		window.removeEventListener("keyup", this.handleKeyUp, true)
	}
	update = () => {
		if (this.latest) {
			gvar.os.mediaTower.forceSpeedCallbacks.add(this.realize)
			this.realize()
		} else {
			this.intervalId = (clearInterval(this.intervalId), null)
			this.syncDouyinSpeed(null)
			this.syncYoutube(false)
		}
	}
	private syncDouyinSpeed = (speed: number | null) => {
		if (!IS_DOUYIN) return
		this.douyinSpeed = speed
		const server = gvar.os.stratumServer
		if (server.initialized) this.sendDouyinSpeed()
		else server.initCbs.add(this.sendDouyinSpeed)
	}
	private sendDouyinSpeed = () => {
		gvar.os.stratumServer.send({ type: "DOUYIN_SPEED", speed: this.douyinSpeed } satisfies DouyinSpeedMessage)
	}
	private syncYoutube = (enabled: boolean, speed?: number) => {
		if (!IS_YOUTUBE) return
		// Captions only need rescheduling when the sync turns on or the speed changes; new videos resync on
		// play. Resyncing on every realize patched YouTube's player prototype every second.
		const synced = enabled ? speed : null
		if (synced === this.youtubeSyncedSpeed) return
		this.youtubeSyncedSpeed = synced
		this.youtubeSyncEnabled = enabled
		const server = gvar.os.stratumServer
		if (server.initialized) this.sendYoutubeSync()
		else server.initCbs.add(this.sendYoutubeSync)
	}
	private handleServerMessage = (data: YoutubeLiveMessage) => {
		if (data?.type !== "YOUTUBE_LIVE") return
		// The main world tracks the same element: YouTube's main player video.
		const video = document.getElementById("movie_player")?.querySelector("video")
		if (!video || !!video.gsLive === data.value) return
		data.value ? (video.gsLive = true) : delete video.gsLive
		gvar.os.mediaTower.updateLiveLock(video)
	}
	private sendYoutubeSync = () => {
		gvar.os.stratumServer.send({ type: "YOUTUBE_SYNC", enabled: this.youtubeSyncEnabled } satisfies YoutubeSyncMessage)
	}
	handlePointerDown = (e: PointerEvent) => {
		if (this.holdToSpeed && isLeftPointerOrMiddleMouse(e) && !this.keyDownActive()) {
			// If directly on video.
			if ((e.target as HTMLVideoElement)?.tagName === "VIDEO") {
				this.setPointerDownToNow()
				return
			}

			// If over a video.
			if (checkIfPointerOverVideo(document, e)) {
				this.setPointerDownToNow()
				return
			}

			// More thoroughly check if over a video.
			const shadowRoots = new Set(
				[...gvar.os.mediaTower.media].filter((v) => !v.paused && v.tagName === "VIDEO" && v.gsShadowRoot).map((v) => v.gsShadowRoot),
			)
			if (shadowRoots.size && [...shadowRoots].some((root) => checkIfPointerOverVideo(root, e))) {
				this.setPointerDownToNow()
			}
		}
	}
	setPointerDownToNow = () => {
		this.pointerDownAt = Date.now()
		setTimeout(this.realize, 620)
	}
	handlePointerUp = (e: PointerEvent) => {
		if (isLeftPointerOrMiddleMouse(e)) this.clearPointerDown()
	}
	handlePointerCancel = () => {
		this.clearPointerDown()
	}
	clearPointerDown = (e?: PointerEvent) => {
		if ((!e || e.relatedTarget === null) && this.pointerDownAt) {
			delete this.pointerDownAt
			this.realize()
		}
	}
	pointerDownActive = () => {
		return this.pointerDownAt && between(600, 30_000, Date.now() - this.pointerDownAt)
	}
	keyDownActive = () => {
		return this.keyDownAt && between(0, 30_000, Date.now() - this.keyDownAt)
	}
	processTemporarySpeed = (factor: number) => {
		if (factor) {
			this.holdToSpeedForKeyboard = factor
			this.keyDownAt = Date.now()
		} else {
			delete this.keyDownAt
		}
		this.realize()
	}
	handleKeyUp = () => {
		// Only a held temporary-speed key changes anything on release.
		if (this.keyDownAt == null) return
		delete this.keyDownAt
		this.realize()
	}
	previousUrl: string
	/**
	 * Re-applies speed every second for sites that reset it. The top frame always needs it, to notice URL
	 * changes; other frames, often ads, only once they have media. New media calls realize, which starts it.
	 */
	private ensureInterval = () => {
		if (this.intervalId == null && (gvar.isTopFrame || !gvar.os.mediaTower.media.isEmpty())) {
			this.intervalId = setInterval(this.realize, 1000)
		}
	}
	realize = () => {
		if (this.latest) {
			this.ensureInterval()
			let speed = this.latest.speed
			if (this.holdToSpeed && this.pointerDownActive()) {
				speed *= this.holdToSpeed
			} else if (this.holdToSpeedForKeyboard && this.keyDownActive()) {
				speed *= this.holdToSpeedForKeyboard
			}

			gvar.os.mediaTower.applySpeedToAll(speed, this.latest.freePitch)
			const conformed = conformSpeed(speed)
			this.syncDouyinSpeed(conformed)
			this.syncYoutube(true, conformed)
		}

		// Unrelated to speed: Update all other frames if top frame's URL changes.
		if (gvar.isTopFrame && this.previousUrl !== location.href) {
			this.previousUrl = location.href
			chrome.runtime.sendMessage({ type: "REQUEST_NOTIFY_TOP_FRAME_URL_CHANGE", value: this.previousUrl } as Messages)
		}
	}
}

const PROHIBITED_TYPES = new Set(["INPUT", "BUTTON", "TEXTAREA"])
const PROHIBITED_ROLES = new Set(["slider", "button", "togglebutton", "menuitem", "tab"])
function checkIfPointerOverVideo(doc: DocumentOrShadowRoot, e: PointerEvent) {
	const elems = doc.elementsFromPoint(e.clientX, e.clientY)
	return (
		elems.some((elem) => elem.tagName === "VIDEO") &&
		elems.every((elem) => !PROHIBITED_TYPES.has(elem.tagName) && !PROHIBITED_ROLES.has(elem.role) && !(elem as HTMLElement).draggable)
	)
}

function isLeftPointerOrMiddleMouse(e: PointerEvent) {
	if (e.button === 0) return true
	if (e.button === 1 && e.pointerType === "mouse") return true
}
