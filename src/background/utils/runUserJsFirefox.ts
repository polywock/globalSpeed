// Firefox has no MV3 userScripts.execute, so the isolated content script relays the code
// into the page world instead. Delivery fails when the tab has no content script, which
// is routine, so swallow it the way the other optimistic sends here do.
export async function runUserJs(tabId: number, code: string) {
	try {
		await chrome.tabs.sendMessage(tabId, { type: "RUN_JS", value: code }, { frameId: 0 })
	} catch {}
}
