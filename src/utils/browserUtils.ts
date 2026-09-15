export async function getLatestActiveTabInfo(): Promise<TabInfo> {
	let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
	const [tab] = tabs
	if (!tab) return
	return {
		tabId: tab.id,
		windowId: tab.windowId,
		url: tab.url,
	}
}

export type TabInfo = { tabId: number; frameId?: number; windowId: number; url?: string }

export function compareFrame(a: TabInfo, b: TabInfo) {
	return a?.tabId === b?.tabId && (a?.frameId ?? null) === (b?.frameId ?? null)
}

export function tabToTabInfo(tab: chrome.tabs.Tab): TabInfo {
	if (!tab) return
	return { tabId: tab.id, frameId: 0, windowId: tab.windowId, url: tab.url }
}

export function requestTabInfo(): Promise<TabInfo> {
	return chrome.runtime.sendMessage({ type: "REQUEST_TAB_INFO" })
}

export function requestCreateTab(url: string): Promise<number> {
	return chrome.runtime.sendMessage({
		type: "REQUEST_CREATE_TAB",
		url,
	})
}

export type MessageCallback = (msg: any, sender: chrome.runtime.MessageSender, reply: (msg: any) => any) => void | true

export function setSession(override?: any) {
	if (chrome.storage.session) return chrome.storage.session.set(override)
	return chrome.runtime.sendMessage({ type: "SET_SESSION", override } as Messages)
}

export async function checkContentScript(tabId: number, frameId: number) {
	try {
		const result = await chrome.tabs.get(tabId)
		if (result.frozen) return false
		if (result.discarded) return null
		await chrome.tabs.sendMessage(tabId, { type: "CS_ALIVE" }, { frameId: frameId || 0 })
		return true
	} catch (err) {}
}

/** True/false if known, undefined if it couldn't be determined. */
export async function frameExists(tabId: number, frameId: number) {
	try {
		const frames = await chrome.webNavigation?.getAllFrames({ tabId })
		if (!frames) return
		return frames.some((f) => f.frameId === (frameId || 0))
	} catch {}
}

// Sends to a specific frame, optimistically (no upfront liveness ping). If delivery fails because the
// frame id is stale (e.g. iframe recreated), drop its cached scope and retry on the top frame. Frozen
// tabs are left untouched — their media is real and recovers on unfreeze, so we must not evict them.
export async function sendToFrame(tabId: number, frameId: number, payload: Messages) {
	try {
		await chrome.tabs.sendMessage(tabId, payload, { frameId })
		return
	} catch {}

	let tab: chrome.tabs.Tab
	try {
		tab = await chrome.tabs.get(tabId)
	} catch {}
	if (tab?.frozen) return

	// A failed delivery alone does not prove the frame is gone. Keep its snapshot
	// and avoid replaying an action in another frame unless the original is gone.
	if (tab && !tab.discarded && (await frameExists(tabId, frameId)) !== false) return
	await chrome.storage.session.remove(`m:scope:${tabId}:${frameId}`)
	if (tab && !tab.discarded && frameId !== 0) {
		try {
			await chrome.tabs.sendMessage(tabId, payload, { frameId: 0 })
		} catch {}
	}
}
