import debounce from "lodash.debounce"
import { gvar } from "@/globalVar"
import { formatSpeedForBadge } from "@/utils/configUtils"
import { isMobile } from "@/utils/helper"
import { fetchView } from "@/utils/state"

type BadgeInit = Awaited<ReturnType<typeof getBadgeInit>>

let updating = false
let updatePending = false

const standardIcons = { "128": `images/128.png` }
const grayscaleIcons = { "128": `images/128g.png` }

async function updateVisible() {
	updatePending = true
	if (updating) return
	updating = true
	try {
		// Startup can restore pinned contexts while an earlier icon is still loading.
		// Finish each refresh before reading and writing the latest state again.
		while (updatePending) {
			updatePending = false
			await writeBadge(await getBadgeInit(0))
			await updateTabs(await chrome.tabs.query({ active: true }))
		}
	} catch (err) {
		console.error(err)
	} finally {
		updating = false
	}
}

const updateVisibleDeb = debounce(updateVisible, 100, { leading: true, trailing: true, maxWait: 1000 })

async function updateTabs(tabs: chrome.tabs.Tab[]) {
	return Promise.allSettled(tabs.map((tab) => updateTab(tab)))
}

async function updateTab(tab: chrome.tabs.Tab) {
	const init = await getBadgeInit(tab.id)
	await writeBadge(init, tab.id)
}

async function getBadgeInit(tabId: number) {
	const { isPinned, speed, enabled, hasOrl, superDisable, hideBadge } = await fetchView(
		{ hideBadge: true, superDisable: true, isPinned: true, speed: true, enabled: true, hasOrl: true },
		tabId,
	)

	const isEnabled = enabled && !superDisable
	let showBadge = isEnabled && !hideBadge

	let badgeIcons = isEnabled ? standardIcons : grayscaleIcons
	let badgeText = showBadge ? formatSpeedForBadge(speed ?? 1) : ""
	let badgeColor = "#000"

	if (hasOrl && !isEnabled && !hideBadge) {
		showBadge = true
		badgeText = "OFF"
	}

	if (showBadge) {
		badgeColor = hasOrl ? "#7fffd4" : isPinned ? "#44a" : "#a33"
	}
	return { badgeText, badgeColor, badgeIcons }
}

type BadgeField = "text" | "color" | "icon"

// Values last written per tab (undefined = default action). Each write makes the browser
// repaint its toolbar, and setIcon also reloads the image, so skip unchanged values.
const written = new Map<number | undefined, Partial<Record<BadgeField, unknown>>>()
// Bumped when a tab's values are forgotten, so writes in flight across a reset aren't cached.
const generations = new Map<number, number>()

// Per-tab action values reset on navigation, so forget them. Extra clears only cost a rewrite.
function forgetTab(tabId: number) {
	written.delete(tabId)
	generations.set(tabId, (generations.get(tabId) ?? 0) + 1)
}

async function writeBadge(init: BadgeInit, tabId?: number) {
	const generation = generations.get(tabId)
	const prev = written.get(tabId) ?? {}
	const next = { text: init.badgeText, color: init.badgeColor, icon: init.badgeIcons }
	const writers: Record<BadgeField, () => Promise<void>> = {
		text: () => chrome.action.setBadgeText({ text: next.text, tabId }),
		color: () => chrome.action.setBadgeBackgroundColor({ color: next.color, tabId }),
		icon: () => chrome.action.setIcon({ path: next.icon, tabId }),
	}
	const fields = (Object.keys(writers) as BadgeField[]).filter((f) => prev[f] !== next[f])
	if (!fields.length) return

	// A tab may close during a refresh; still wait for every write to settle.
	const results = await Promise.allSettled(fields.map((f) => writers[f]()))
	// A navigation during the writes may have reset them; leave this tab uncached to rewrite later.
	if (generations.get(tabId) !== generation) return
	const current = written.get(tabId) ?? {}
	fields.forEach((f, i) => {
		if (results[i].status === "fulfilled") current[f] = next[f]
		else delete current[f]
	})
	written.set(tabId, current)
}

const WATCHERS = [
	/^g:(speed|enabled|superDisable|hideBadge)/,
	/^[rt]:[\d\w]+:(speed|isPinned|enabled)/,
	/^[r]:[\d\w]+:(elementFx|backdropFx|latestViaShortcut)/,
]

if (!isMobile()) {
	gvar.es.addWatcher(WATCHERS, (changes) => {
		updateVisibleDeb()
	})
	gvar.sess.safeCbs.add(() => updateVisible())
	chrome.webNavigation.onCommitted.addListener((details) => {
		// Subframe commits (e.g. ads) don't reset the action; only the tab's own document does.
		// frameType covers prerendered main frames (nonzero frameId); Firefox omits it.
		if (details.frameId !== 0 && details.frameType !== "outermost_frame") return
		forgetTab(details.tabId)
		updateVisible()
	})
	// Also covers navigations without a main-frame commit event, like prerender activation.
	chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
		if (changeInfo.status !== "loading" && changeInfo.url == null) return
		forgetTab(tabId)
		updateVisible()
	})
	chrome.tabs.onRemoved.addListener((tabId) => {
		written.delete(tabId)
		generations.delete(tabId)
	})
	chrome.tabs.onActivated.addListener(() => updateVisible())
}
