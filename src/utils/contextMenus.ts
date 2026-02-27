import debounce from "lodash.debounce"
import { AdjustMode, Keybind } from "@/types"
import { fetchView } from "./state"

export async function syncContextMenu(keybinds?: Keybind[]) {
	try {
		return await _syncContextMenus(keybinds)
	} catch {
		console.log("Failed syncing context menu items")
	}
}

async function _syncContextMenus(keybinds?: Keybind[]) {
	if (!chrome.contextMenus) return
	let createdParents = new Set<string>()
	await removeAll()
	keybinds = keybinds || (await fetchView(["menuKeybinds"])).menuKeybinds
	keybinds = keybinds.filter((kb) => kb.enabled && (kb.contextLabel || kb.contextLabelAlt))
	if (!keybinds.length) return

	await create({
		id: "parent",
		title: "Global Speed",
		contexts: ["all"],
		documentUrlPatterns: ["https://*/*", "http://*/*"],
	})

	for (let kb of keybinds) {
		await createContextMenuItem(createdParents, kb)
		if (kb.allowAlt && kb.adjustMode === AdjustMode.CYCLE) {
			await createContextMenuItem(createdParents, kb, true)
		}
	}
}

async function getContextMenuParent(created: Set<string>, path: string[]) {
	let parentId = "parent"
	for (let i = 0; i < path.length - 1; i++) {
		let parents = path.slice(0, i + 1)
		let id = parents.map((p) => `fold_${p.toLowerCase()}`).join(".")
		if (!created.has(id)) {
			await create({
				id,
				title: path[i],
				contexts: ["all"],
				parentId,
				documentUrlPatterns: ["https://*/*", "http://*/*"],
			})
		}
		created.add(id)
		parentId = id
	}

	return parentId
}

async function createContextMenuItem(created: Set<string>, kb: Keybind, alt?: boolean) {
	let label = (alt ? kb.contextLabelAlt : kb.contextLabel) || ""
	if (!label) return
	const path = extractContextMenuPath(label)
	label = path.at(-1)
	let parentId = await getContextMenuParent(created, path)

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

function extractContextMenuPath(label: string) {
	const path = label.split("::").map((part) => part.trim())
	if (path.some((v) => !v)) return [label]
	return path
}
