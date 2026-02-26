import debounce from "lodash.debounce"
import { AdjustMode, Keybind, Trigger } from "@/types"
import { fetchView } from "./state"

export async function syncContextMenu(keybinds?: Keybind[]) {
	if (!chrome.contextMenus) return
	let createdParents = new Set<string>()
	await removeAll()
	keybinds = (await fetchView(["menuKeybinds"])).menuKeybinds
	keybinds = keybinds.filter((kb) => kb.enabled)
	if (!keybinds.length) return

	await create({
		id: "parent",
		title: "Global Speed",
		contexts: ["all"],
		documentUrlPatterns: ["https://*/*", "http://*/*"],
	})

	await Promise.all(
		keybinds.map(async (kb) => {
			await createScaffoldForKeybind(createdParents, kb)
			if (kb.allowAlt && kb.adjustMode === AdjustMode.CYCLE) await createScaffoldForKeybind(createdParents, kb, true)
		}),
	)

	keybinds.forEach((kb) => {
		createForKeybind(createdParents, kb)
		if (kb.allowAlt && kb.adjustMode === AdjustMode.CYCLE) createForKeybind(createdParents, kb, true)
	})
}

function createScaffoldForKeybind(created: Set<string>, kb: Keybind, alt?: boolean) {
	const label = (alt ? kb.contextLabelAlt : kb.contextLabel) || ""
	if (!label.includes("::")) return
	const title = label.split("::")[0].trim()
	if (!title) return
	const id = `fold_${title.toLowerCase()}`
	if (created.has(id)) return
	created.add(id)

	return create({
		id,
		title,
		contexts: ["all"],
		parentId: "parent",
		documentUrlPatterns: ["https://*/*", "http://*/*"],
	})
}

function createForKeybind(created: Set<string>, kb: Keybind, alt?: boolean) {
	let parentId = "parent"
	let label = (alt ? kb.contextLabelAlt : kb.contextLabel) || ""
	if (label.includes("::")) {
		let [folder, rest] = label.split("::")
		folder = `fold_${folder.trim().toLowerCase()}`
		if (created.has(folder)) {
			parentId = folder
			label = rest.trim()
		}
	}

	return create({
		id: alt ? `ALT_${kb.id}` : kb.id,
		title: label?.trim() || "---",
		type: "normal",
		contexts: ["all"],
		parentId,
		documentUrlPatterns: ["https://*/*", "http://*/*"],
	})
}

export const syncContextMenuDeb = debounce(syncContextMenu, 1000, { trailing: true })

function removeAll(): Promise<void> {
	return new Promise((res, rej) => {
		chrome.contextMenus.removeAll(() => {
			if (chrome.runtime.lastError) rej(chrome.runtime.lastError)
			res()
		})
	})
}

function create(opts: chrome.contextMenus.CreateProperties): Promise<void> {
	return new Promise((res, rej) => {
		chrome.contextMenus.create(opts, () => {
			if (chrome.runtime.lastError) rej(chrome.runtime.lastError)
			res()
		})
	})
}
