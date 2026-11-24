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
