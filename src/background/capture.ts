import debounce from "lodash.debounce"
import { AUDIO_CONTEXT_KEYS, AnyDict } from "@/types"
import { fetchView } from "@/utils/state"

async function handleChange(changes: chrome.storage.StorageChanges) {
	let raw = await gvar.es.getAllUnsafe()
	if (raw["g:superDisable"]) {
		chrome.runtime.sendMessage({ type: "OFFSCREEN_PUSH", superDisable: true })
		return
	}
	const capturedTabs = raw["s:captured"] || []
	if (capturedTabs.length == 0) return
	const tabsToPush = checkTabsToPush(changes, raw, capturedTabs)
	if (tabsToPush.length) {
		const updates = await Promise.all(tabsToPush.map((t) => fetchView(AUDIO_CONTEXT_KEYS, t).then((view) => ({ view, tabId: t }))))
		chrome.runtime.sendMessage({ type: "OFFSCREEN_PUSH", updates })
	}
}

let afxRelevantKeys = [...AUDIO_CONTEXT_KEYS, "isPinned"]

function checkTabsToPush(changes: chrome.storage.StorageChanges, raw: AnyDict, captured: number[]): number[] {
	let keysChangedFor = []

	for (let tab of captured) {
		// check t:x:afx and a:x:isPinned was changed
		if (afxRelevantKeys.some((key) => changes[`t:${tab}:${key}`] || changes[`r:${tab}:${key}`])) {
			keysChangedFor.push(tab)
			continue
		}

		// check current a:x:isPinned, and if not pinned, check if g:afx was changed.
		if (!raw[`t:${tab}:isPinned`] && AUDIO_CONTEXT_KEYS.some((key) => changes[`g:${key}`])) {
			keysChangedFor.push(tab)
		}
	}

	return keysChangedFor
}

const handleChangeDeb = debounce(handleChange, 500, { maxWait: 500, leading: true, trailing: true })

chrome.tabCapture && chrome.offscreen && gvar.es.addWatcher([], handleChangeDeb)
