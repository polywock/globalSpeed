import { useEffect, useMemo, useState } from "react"
import { gvar } from "@/globalVar"
import { checkContentScript, frameExists } from "@/utils/browserUtils"
import { flattenMediaInfos, MediaData, MediaPath, MediaScope } from "../contentScript/isolated/utils/genMediaInfo"

type Env = {
	client: SubscribeMedia
}

export function useMediaWatch(): MediaData {
	const [watchInfo, setWatchInfo] = useState(null as MediaData)
	const env = useMemo<Env>(() => ({}) as Env, [])

	useEffect(() => {
		env.client = new SubscribeMedia(gvar.tabInfo?.tabId, setWatchInfo)
		return () => {
			env.client.release()
			delete env.client
		}
	}, [])

	return watchInfo
}

const MINIMUM_DURATION = 10

type SubscribeMediaCallback = (infos: MediaData) => void

export class SubscribeMedia {
	cbs: Set<SubscribeMediaCallback> = new Set()
	scopes: { [key: string]: MediaScope } = {}
	pinned: MediaPath
	latestData: MediaData
	released = false
	seenMedia: Set<string> = new Set()
	seenMediaArr: string[] = []
	private pendingChanges: chrome.storage.StorageChanges = {}

	constructor(
		private tabId: number,
		cb: SubscribeMediaCallback,
	) {
		cb && this.cbs.add(cb)
		this.start()
	}
	start = async () => {
		// Subscribe before reading/checking the snapshot so updates during startup are
		// replayed after it, including removals and changes to the pinned video.
		chrome.storage.session.onChanged.addListener(this.handleChange)
		const raw = await chrome.storage.session.get()
		if (this.released) return
		await Promise.all(Object.entries(raw).map(([key, value]) => this.processKeyForStart(key, value)))
		if (this.released) return
		const changes = this.pendingChanges
		this.pendingChanges = null
		this.handleChange(Object.keys(changes).length ? changes : null)
	}
	processKeyForStart = async (key: string, value: any) => {
		if (!key.startsWith("m:")) return
		if (key.startsWith("m:pin")) {
			this.pinned = value
		} else if (key.startsWith("m:scope:")) {
			let info = value as MediaScope
			if (!info) return
			const status = await checkContentScript(info.tabInfo?.tabId, info.tabInfo.frameId)
			const gone = status == null && (await frameExists(info.tabInfo?.tabId, info.tabInfo.frameId)) === false
			if (this.released || key in this.pendingChanges) return
			if (gone) {
				// A failed ping alone is insufficient evidence to delete shared media.
				await chrome.storage.session.remove(key)
			} else {
				this.scopes[key] = value
			}
		}
	}
	release = () => {
		if (this.released) return
		this.released = true
		;(delete this.latestData, delete this.scopes, delete this.seenMedia, delete this.triggerCbs, delete this.pinned)
		chrome.storage.session.onChanged.removeListener(this.handleChange)
		this.cbs.clear()
	}
	handleChange = async (changes: chrome.storage.StorageChanges) => {
		if (this.released) return
		if (this.pendingChanges) {
			Object.assign(this.pendingChanges, changes)
			return
		}
		let hadChanges = !changes
		changes = changes ?? {}

		for (let key in changes) {
			if (!key.startsWith("m:")) continue

			hadChanges = true
			if (key.startsWith("m:pin")) {
				this.pinned = changes[key].newValue
			} else if (key.startsWith("m:scope:")) {
				this.scopes[key] = changes[key].newValue
				if (this.scopes[key] == null) {
					delete this.scopes[key]
				}
			}
		}

		if (!hadChanges) return

		this.calcLatest()

		this.triggerCbs()
	}
	triggerCbs = () => {
		this.cbs.forEach((cb) => cb(this.latestData))
	}
	calcLatest = () => {
		const toShow = new Set<string>()
		const pinnedKey = this.pinned?.key
		const infos = flattenMediaInfos(Object.values(this.scopes) as MediaScope[])
			.filter((info) => info.readyState && (info.key === pinnedKey || info.duration > MINIMUM_DURATION))
			.sort((a, b) => {
				if (a.tabInfo.tabId === this.tabId) return -Infinity
				return a.tabInfo.tabId - b.tabInfo.tabId
			})

		// Add pinned videos first.
		const pinnedInfo = infos.find((info) => info.key === pinnedKey)
		if (pinnedInfo) {
			toShow.add(pinnedInfo.key)
			if (!this.seenMedia.has(pinnedInfo.key)) {
				this.seenMedia.add(pinnedInfo.key)
				this.seenMediaArr.push(pinnedInfo.key)
			}
		}

		// Add current tab videos first.
		infos
			.filter((info) => info.tabInfo.tabId === this.tabId)
			.sort((a, b) => (b.intersectionRatio || -1) - (a.intersectionRatio || -1))
			.forEach((info) => {
				toShow.add(info.key)
				if (!this.seenMedia.has(info.key)) {
					this.seenMedia.add(info.key)
					this.seenMediaArr.push(info.key)
				}
			})

		// Add previously seen videos (for UI consistency)
		infos.forEach((info) => {
			if (this.seenMedia.has(info.key)) {
				toShow.add(info.key)
			}
		})

		// Add three most recently played.
		infos
			.filter((info) => info.tabInfo.tabId !== this.tabId && info.lastPlayed)
			.sort((a, b) => {
				return b.lastPlayed - a.lastPlayed
			})
			.slice(0, 3)
			.forEach((info) => {
				toShow.add(info.key)
				if (!this.seenMedia.has(info.key)) {
					this.seenMedia.add(info.key)
					this.seenMediaArr.push(info.key)
				}
			})

		this.latestData = {
			pinned: this.pinned,
			infos: this.seenMediaArr
				.filter((key) => toShow.has(key))
				.map((key) => infos.find((info) => info.key === key))
				.filter((info) => info)
				// Final sort in case new videos are added while open.
				.sort((a, b) => {
					return Number(b.tabInfo.tabId === this.tabId || b.key === pinnedKey) - Number(a.tabInfo.tabId === this.tabId || b.key === pinnedKey)
				}),
		}
	}
}
