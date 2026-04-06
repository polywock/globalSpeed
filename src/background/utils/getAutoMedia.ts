import { FlatMediaInfo, flattenMediaInfos, MediaData, MediaDataWithScopes, MediaPath, MediaScope } from "@/contentScript/isolated/utils/genMediaInfo"
import { checkContentScript, compareFrame, TabInfo } from "@/utils/browserUtils"
import { fetchView } from "@/utils/state"

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

const WEIGHTS = {
	SAME_FRAME: 0b10_000_000_000_000,
	IS_VISIBLE: 0b1_000_000_000_000,
	LARGE_VIDEO: 0b100_000_000_000,
	PEAK_INTERSECT: 0b100_000_000_000,
	INTERSECT_90: 0b10_000_000_000,
	INTERSECT_50: 0b1_000_000_000,
	INTERSECT_10: 0b100_000_000,
	ACTIVE: 0b100_000_000,
	DURATION_10M: 0b1000,
	DURATION_3M: 0b100,
	DURATION_1M: 0b10,
	DISQUALIFIED: -0b1,
}

export async function getMediaDataWithScopes() {
	const raw = await chrome.storage.session.get<RecordAny>()
	let pinned: MediaPath
	let scopes: MediaScope[] = []

	for (let key in raw) {
		if (!key.startsWith("m:")) continue
		if (key.startsWith("m:pin")) {
			pinned = raw[key]
		} else if (key.startsWith("m:scope:")) {
			scopes.push(raw[key])
		}
	}
	return { pinned, scopes } satisfies MediaDataWithScopes
}

export async function clearClosed() {
	const [tabs, data] = await Promise.all([chrome.tabs.query({}), chrome.storage.session.get<RecordAny>()])
	const tabIds = new Set(tabs.map((t) => t.id))
	const clearKeys: string[] = []
	for (let key in data) {
		if (!key.startsWith("m:scope:")) return
		if (tabIds.has(data[key]?.tabInfo.tabId)) return
		clearKeys.push(key)
	}
	chrome.storage.session.remove(clearKeys)
}

export async function getMediaData() {
	const d = await getMediaDataWithScopes()
	return { pinned: d.pinned, infos: flattenMediaInfos(d.scopes) } satisfies MediaData
}

export async function getAutoMedia(tabInfo: TabInfo, videoOnly?: boolean) {
	let [{ ignorePiP }, { infos, pinned }] = await Promise.all([fetchView({ ignorePiP: true }), getMediaData()])
	logInfo("getAutoMedia:start", `tabId=${tabInfo?.tabId} frameId=${tabInfo?.frameId} videoOnly=${!!videoOnly} ignorePiP=${ignorePiP} total=${infos?.length}`)

	infos = infos.filter((info) => info.readyState)
	infos = videoOnly ? infos.filter((info) => info.videoSize) : infos
	logInfo("getAutoMedia:after-filter", `count=${infos.length} keys=[${infos.map((i) => `${i.key}(${i.tabInfo?.tabId}:${i.tabInfo?.frameId})`).join(",")}]`)

	const pinnedInfo = infos.find((info) => info.key === pinned?.key)
	if (pinnedInfo) {
		const pinnedAlive = await checkContentScript(pinnedInfo.tabInfo.tabId, pinnedInfo.tabInfo.frameId)
		logInfo("getAutoMedia:pinned-candidate", `key=${pinnedInfo.key} tab=${pinnedInfo.tabInfo?.tabId} frame=${pinnedInfo.tabInfo?.frameId} alive=${pinnedAlive}`)
		if (pinnedAlive) return pinnedInfo
	}

	infos.sort((a, b) => b.creationTime - a.creationTime)
	let pippedInfo = infos.find((info) => info.pipMode) || infos.find((info) => info.isDip)
	if (pippedInfo && !(await checkContentScript(pippedInfo.tabInfo.tabId, pippedInfo.tabInfo.frameId))) {
		logError("getAutoMedia:pip-dead", `key=${pippedInfo.key} tab=${pippedInfo.tabInfo?.tabId} frame=${pippedInfo.tabInfo?.frameId}`)
		pippedInfo = null
	}

	if (!ignorePiP && pippedInfo) return pippedInfo
	if (tabInfo) {
		infos = infos.filter((info) => info.tabInfo.tabId === tabInfo.tabId)
		logInfo("getAutoMedia:tab-filter", `tabId=${tabInfo.tabId} remaining=${infos.length}`)
	}

	if (!infos.length) {
		logInfo("getAutoMedia:no-info-return-pip", `pip=${pippedInfo?.key} tab=${pippedInfo?.tabInfo?.tabId} frame=${pippedInfo?.tabInfo?.frameId}`)
		return pippedInfo || undefined
	}

	const now = Date.now()
	let peakIntersect = infos
		.filter((v) => v.intersectionRatio != null)
		.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]?.intersectionRatio

	let highest: { info: FlatMediaInfo; score: number }
	infos.forEach((info) => {
		let score = 0

		if (compareFrame(info.tabInfo, tabInfo) && tabInfo.frameId !== 0) score += WEIGHTS.SAME_FRAME
		if (info.isVisible) score += WEIGHTS.IS_VISIBLE
		if (!info.paused || (info.lastPlayed && now - info.lastPlayed < 60_000)) score += WEIGHTS.ACTIVE

		if (info.intersectionRatio > 0.1 && info.intersectionRatio === peakIntersect) {
			score += WEIGHTS.PEAK_INTERSECT
		} else if (info.intersectionRatio > 0.9) {
			score += WEIGHTS.INTERSECT_90
		} else if (info.intersectionRatio > 0.5) {
			score += WEIGHTS.INTERSECT_50
		} else if (info.intersectionRatio > 0.1) {
			score += WEIGHTS.INTERSECT_10
		}

		if (info.elementSize && info.elementSize.w > 200 && info.elementSize.h > 200) {
			score += WEIGHTS.LARGE_VIDEO
		}

		if (info.infinity || info.duration >= 10 * 60) {
			score += WEIGHTS.DURATION_10M
		} else if (info.duration >= 3 * 60) {
			score += WEIGHTS.DURATION_3M
		} else if (info.duration >= 1 * 60) {
			score += WEIGHTS.DURATION_1M
		}

		if (!info.isConnected && info.hasAudioTrack && info.domain === "open.spotify.com") score += WEIGHTS.SAME_FRAME

		if (!highest || score > highest.score || (score === highest.score && (info.infinity ? 60 : info.duration) > highest.info.duration)) {
			highest = { info, score }
		}
	})

	if (!highest) {
		logInfo("getAutoMedia:selected", `key=none`)
		return undefined
	}

	// Validate selected candidate's frame is still alive (guard against stale navigation caches)
	const selectedAlive = await checkContentScript(highest.info.tabInfo.tabId, highest.info.tabInfo.frameId)
	if (!selectedAlive) {
		logError("getAutoMedia:selected-dead", `key=${highest.info.key} tab=${highest.info.tabInfo?.tabId} frame=${highest.info.tabInfo?.frameId} — stale cache, dropping and retrying`)
		// Remove stale entry from session storage and retry with remaining candidates
		const staleKey = `m:scope:${highest.info.tabInfo.tabId}:${highest.info.tabInfo.frameId}`
		chrome.storage.session.remove(staleKey)
		infos = infos.filter((info) => info.key !== highest.info.key)
		if (!infos.length) return pippedInfo || undefined
		// Re-score remaining candidates
		highest = undefined
		infos.forEach((info) => {
			let score = 0
			if (compareFrame(info.tabInfo, tabInfo) && tabInfo?.frameId !== 0) score += WEIGHTS.SAME_FRAME
			if (info.isVisible) score += WEIGHTS.IS_VISIBLE
			if (!info.paused || (info.lastPlayed && Date.now() - info.lastPlayed < 60_000)) score += WEIGHTS.ACTIVE
			if (!highest || score > highest.score || (score === highest.score && (info.infinity ? 60 : info.duration) > highest.info.duration)) {
				highest = { info, score }
			}
		})
		logInfo("getAutoMedia:selected-retry", `key=${highest?.info?.key} tab=${highest?.info?.tabInfo?.tabId} frame=${highest?.info?.tabInfo?.frameId} score=${highest?.score}`)
		return highest?.info
	}

	logInfo("getAutoMedia:selected", `key=${highest?.info?.key} tab=${highest?.info?.tabInfo?.tabId} frame=${highest?.info?.tabInfo?.frameId} score=${highest?.score}`)

	return highest?.info
}
