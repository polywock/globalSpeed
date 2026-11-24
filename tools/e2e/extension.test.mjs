// End-to-end scenarios in real Chromium. Needs a dev build first: `npm run dev`, then `npm run test:e2e`.
// Set HEADED=1 to watch the browser.

import assert from "node:assert/strict"
import { after, afterEach, before, beforeEach, test } from "node:test"
import { launch, mediaProp, playingFrame, serveAs, sleep, startServer, waitFor } from "./harness.mjs"

let ext
let server

before(async () => {
	server = await startServer()
	ext = await launch()
	// New installs only allow shortcuts on listed sites; allow them everywhere for the fixtures.
	await ext.setStorage({ "g:keybindsUrlCondition": null })
})

after(async () => {
	await ext?.close()
	await server?.close()
})

beforeEach(async () => {
	await ext.setStorage({ "g:speed": 1, "g:rules": [] })
})

afterEach(async () => {
	for (const page of ext.context.pages()) await page.close()
})

/** Opens a fixture and waits for its media to play, giving the content script a moment to settle. */
async function open(path) {
	const page = await ext.context.newPage()
	await page.goto(server.origin + path)
	const frame = await playingFrame(page)
	await sleep(300)
	return { page, frame }
}

/** Presses a key and waits for the media's `prop` to reach `value`. */
async function pressUntil(page, frame, key, prop, value) {
	await page.keyboard.press(key)
	await waitFor(async () => Math.abs((await mediaProp(frame, prop)) - value) < 1e-6, { message: `${prop} = ${value} after ${key}` })
}

/** Fails with the offending writes, including where they came from. */
function assertNoNoopWrites(writes) {
	const noops = writes.filter((w) => w.noop.length)
	assert.equal(noops.length, 0, `no-op storage writes:\n${noops.map((w) => `${w.noop.join(", ")}\n${w.stack}`).join("\n\n")}`)
}

test("a page shortcut changes the speed of a video", async () => {
	const { page, frame } = await open("/video.html")
	await pressUntil(page, frame, "KeyD", "playbackRate", 1.1)
	await pressUntil(page, frame, "KeyS", "playbackRate", 1)
})

test("a shortcut pressed in the page reaches a video inside an iframe", async () => {
	const { page, frame } = await open("/iframe.html")
	assert.notEqual(frame, page.mainFrame())
	await pressUntil(page, frame, "KeyD", "playbackRate", 1.1)
})

test("a shortcut reaches a video inside a closed shadow root", async () => {
	const { page, frame } = await open("/shadow.html")
	await pressUntil(page, frame, "KeyD", "playbackRate", 1.1)
})

test("shortcuts keep working, and the speed carries over, after the service worker is stopped", async () => {
	const { page, frame } = await open("/video.html")
	await pressUntil(page, frame, "KeyD", "playbackRate", 1.1)
	await ext.stopWorker()
	// The key press wakes a fresh worker, which has to restore state from storage.
	await pressUntil(page, frame, "KeyD", "playbackRate", 1.2)
})

test("a volume shortcut changes the volume without no-op storage writes", async () => {
	const { "g:pageKeybinds": keybinds } = await ext.storage(["g:pageKeybinds"])
	const volumeDown = { id: "e2e-volume", command: "volume", enabled: true, greedy: true, adjustMode: 2, valueNumber: -0.1, key: "KeyV" }
	await ext.setStorage({ "g:pageKeybinds": [...keybinds, volumeDown] })
	try {
		const { page, frame } = await open("/video.html")
		await ext.recordWrites()
		await pressUntil(page, frame, "KeyV", "volume", 0.9)
		await sleep(300)
		assertNoNoopWrites(await ext.writes())
	} finally {
		await ext.setStorage({ "g:pageKeybinds": keybinds })
	}
})

test("an enabled URL rule applies, and client-side navigation causes no no-op storage writes", async () => {
	const rule = {
		id: "e2e-rule",
		enabled: true,
		type: "SPEED",
		overrideSpeed: 1.5,
		condition: {
			block: false,
			blockParts: [],
			allowParts: [{ id: "p", type: "CONTAINS", valueContains: "127.0.0.1", valueStartsWith: "", valueRegex: "" }],
		},
	}
	await ext.setStorage({ "g:rules": [rule] })
	const { page, frame } = await open("/spa/one")
	await waitFor(async () => (await mediaProp(frame, "playbackRate")) === 1.5, { message: "rule speed 1.5" })

	await ext.recordWrites()
	for (const path of ["/spa/two", "/spa/three", "/spa/four"]) {
		await page.evaluate((path) => window.navigateTo(path), path)
		await sleep(200)
	}
	await sleep(500)
	assert.equal(await mediaProp(frame, "playbackRate"), 1.5)
	assertNoNoopWrites(await ext.writes())
})

test("on YouTube, caption sync doesn't re-run while nothing changes", async () => {
	await ext.setStorage({ "g:speed": 1.5 })
	const page = await ext.context.newPage()
	await serveAs(page, "https://www.youtube.com", server)
	await page.goto("https://www.youtube.com/youtube.html")
	const frame = await playingFrame(page)
	await waitFor(async () => (await mediaProp(frame, "playbackRate")) === 1.5, { message: "speed 1.5" })
	await sleep(500)

	const before = await page.evaluate(() => window.ytPlayerReads)
	await sleep(3000)
	const syncs = (await page.evaluate(() => window.ytPlayerReads)) - before
	assert.equal(syncs, 0, `caption sync ran ${syncs} times in 3 idle seconds`)
})

test("a browser-level shortcut (chrome.commands) changes the speed", async () => {
	const { page, frame } = await open("/video.html")
	const speedUp = { id: "e2e-browser", command: "speed", enabled: true, greedy: true, adjustMode: 2, valueNumber: 0.25, globalKey: "commandB" }
	await ext.setStorage({ "g:browserKeybinds": [speedUp] })
	await ext.command("commandB", page)
	await waitFor(async () => (await mediaProp(frame, "playbackRate")) === 1.25, { message: "speed 1.25" })
})

test("a context menu item changes the speed", async () => {
	const { page, frame } = await open("/video.html")
	const setTwo = { id: "e2e-menu", command: "speed", enabled: true, greedy: true, adjustMode: 1, valueNumber: 2 }
	await ext.setStorage({ "g:menuKeybinds": [setTwo] })
	await ext.menuClick("e2e-menu", page)
	await waitFor(async () => (await mediaProp(frame, "playbackRate")) === 2, { message: "speed 2" })
})

test("settings survive a browser restart, and per-session keys are cleared", async () => {
	await ext.setStorage({ "g:speed": 1.7, "s:e2e": 1, "t:999:speed": 2, "r:999:speed": 3 })
	await ext.restart()
	const stored = await waitFor(
		async () => {
			const st = await ext.storage(["g:speed", "s:e2e", "t:999:speed", "r:999:speed"])
			return st["s:e2e"] == null && st
		},
		{ message: "session keys cleared" },
	)
	assert.equal(stored["t:999:speed"] ?? null, null)
	assert.equal(stored["r:999:speed"] ?? null, null)
	const { frame } = await open("/video.html")
	await waitFor(async () => (await mediaProp(frame, "playbackRate")) === 1.7, { message: "restored speed 1.7" })
})

test("settings saved by an older version are migrated when the extension loads", async () => {
	// Version 15 kept EQ and delay inside audioFx, and pan in its own key.
	await ext.setStorage({
		"g:version": 15,
		"g:audioPan": -0.5,
		"g:audioFx": { pitch: 0, volume: 1, delay: 0.5, delayMerge: true, eq: { enabled: true, factor: 1, values: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0] } },
	})
	await ext.restart()
	const stored = await waitFor(
		async () => {
			const st = await ext.storage(["g:version", "g:audioFx", "g:audioPan"])
			return st["g:version"] === 16 && st
		},
		{ message: "migration to version 16" },
	)
	const effects = stored["g:audioFx"].effects
	assert.deepEqual(
		effects.map((e) => e.type),
		["eq", "delay", "pan"],
	)
	assert.deepEqual(effects[0].eq.values.slice(0, 2), [3, 0])
	assert.equal(effects[1].delay, 0.5)
	assert.equal(effects[1].delayMerge, true)
	assert.equal(effects[2].pan, -0.5)
	assert.equal(stored["g:audioPan"] ?? null, null)
	assert.equal(stored["g:audioFx"].delay, undefined)
})
