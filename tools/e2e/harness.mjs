// End-to-end harness: loads the built extension (build/unpacked) into real Chromium through Playwright,
// serves local fixture pages, and gives tests access to the service worker and its storage.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import http from "node:http"
import { tmpdir } from "node:os"
import { extname, join, resolve } from "node:path"
import { chromium } from "playwright"

const ROOT = resolve(import.meta.dirname, "../..")
export const EXTENSION_DIR = join(ROOT, "build/unpacked")
const FIXTURES = join(import.meta.dirname, "fixtures")

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript" }

/** A few seconds of quiet sine as a WAV, so fixture pages have real, playable media without binary files. */
function createTone(seconds = 4, rate = 8000) {
	const samples = seconds * rate
	const buffer = Buffer.alloc(44 + samples * 2)
	buffer.write("RIFF", 0)
	buffer.writeUInt32LE(36 + samples * 2, 4)
	buffer.write("WAVEfmt ", 8)
	buffer.writeUInt32LE(16, 16)
	buffer.writeUInt16LE(1, 20) // PCM
	buffer.writeUInt16LE(1, 22) // mono
	buffer.writeUInt32LE(rate, 24)
	buffer.writeUInt32LE(rate * 2, 28)
	buffer.writeUInt16LE(2, 32)
	buffer.writeUInt16LE(16, 34)
	buffer.write("data", 36)
	buffer.writeUInt32LE(samples * 2, 40)
	for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 1500), 44 + i * 2)
	return buffer
}

/** Serves tools/e2e/fixtures, plus /tone.wav. Any path under /spa/ serves spa.html, like a single-page app. */
export async function startServer() {
	const tone = createTone()
	const server = http.createServer((req, res) => {
		const path = new URL(req.url, "http://x").pathname
		if (path === "/tone.wav") {
			res.writeHead(200, { "content-type": "audio/wav", "content-length": tone.length })
			return res.end(tone)
		}
		const file = join(FIXTURES, path.startsWith("/spa/") ? "spa.html" : path)
		if (!file.startsWith(FIXTURES) || !existsSync(file)) {
			res.writeHead(404)
			return res.end()
		}
		res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" })
		res.end(readFileSync(file))
	})
	await new Promise((ok) => server.listen(0, "127.0.0.1", ok))
	return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((ok) => server.close(ok)) }
}

/**
 * Serves `origin` (such as https://www.youtube.com) from the local fixture server for this page, so
 * site-specific code runs against a fixture. Paths map directly: https://www.youtube.com/x.html -> /x.html.
 */
export async function serveAs(page, origin, server) {
	await page.route(`${origin}/**`, async (route) => {
		const { pathname, search } = new URL(route.request().url())
		route.fulfill({ response: await route.fetch({ url: server.origin + pathname + search }) })
	})
}

/** Polls until `fn` returns a truthy value, which it returns. */
export async function waitFor(fn, { timeout = 5000, interval = 50, message = "condition" } = {}) {
	const end = Date.now() + timeout
	let last
	while (Date.now() < end) {
		try {
			last = await fn()
			if (last) return last
		} catch (err) {
			last = err
		}
		await new Promise((ok) => setTimeout(ok, interval))
	}
	throw new Error(`Timed out waiting for ${message} (last: ${last instanceof Error ? last.message : JSON.stringify(last)})`)
}

export const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms))

export async function launch() {
	if (!existsSync(join(EXTENSION_DIR, "manifest.json"))) throw new Error("No build found. Run `npm run dev` first.")
	const ext = new Extension(mkdtempSync(join(tmpdir(), "gs-e2e-")))
	await ext.open()
	// Install writes the default state; wait for it so tests start from a settled extension.
	await waitFor(async () => Object.keys(await ext.storage()).some((k) => k.startsWith("g:")), { message: "default state" })
	return ext
}

class Extension {
	constructor(userDataDir) {
		this.userDataDir = userDataDir
	}

	/** Starts the browser on this profile. A profile that already has the extension starts it via onStartup. */
	async open() {
		this.context = await chromium.launchPersistentContext(this.userDataDir, {
			// The full Chromium build; the headless shell can't load extensions.
			channel: "chromium",
			headless: !process.env.HEADED,
			args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`, "--autoplay-policy=no-user-gesture-required"],
		})
	}

	/**
	 * Closes and reopens the browser on the same profile. Storage survives, but Chrome reports a
	 * command-line-loaded extension as freshly installed on every launch (onInstalled, never onStartup).
	 * Our install handler migrates whatever is stored regardless of reason, so this runs the same code as a
	 * real update. The onStartup-only path stays covered by tools/tests/startup.test.mjs alone.
	 */
	async restart() {
		await this.context.close()
		await this.open()
	}

	/** The extension's id for a page's tab. */
	async tabId(page) {
		return (await this.worker()).evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)?.id, page.url())
	}

	/**
	 * Fires a browser-level shortcut (chrome.commands, such as "commandA") for a page's tab. Automation can't
	 * press these, so it calls the background's handler through the dev-build hook.
	 */
	async command(name, page) {
		const tabId = await this.tabId(page)
		await (
			await this.worker()
		).evaluate(async ([name, tabId]) => globalThis.gsTest.handleCommand(name, await chrome.tabs.get(tabId)), [name, tabId])
	}

	/** Clicks a context menu item for a page's tab, through the dev-build hook. */
	async menuClick(menuItemId, page) {
		const tabId = await this.tabId(page)
		await (
			await this.worker()
		).evaluate(async ([menuItemId, tabId]) => globalThis.gsTest.handleMenuClick({ menuItemId }, await chrome.tabs.get(tabId)), [menuItemId, tabId])
	}

	/** The live service worker. After it's stopped, the next event wakes a new one, which this waits for. */
	async worker() {
		const live = this.context.serviceWorkers().find((w) => w.url().endsWith("/background.js"))
		return live ?? this.context.waitForEvent("serviceworker", { predicate: (w) => w.url().endsWith("/background.js") })
	}

	async storage(keys = null) {
		return (await this.worker()).evaluate((keys) => chrome.storage.local.get(keys), keys)
	}

	/** Writes straight to storage; the background and content scripts pick it up through onChanged. */
	async setStorage(items) {
		await (await this.worker()).evaluate((items) => chrome.storage.local.set(items), items)
	}

	/**
	 * Starts recording storage writes made by the service worker. Each write lists its keys and the
	 * no-op ones: keys set to the value they already had (null and absent count as equal), or a write
	 * carrying nothing but a changeId. Every write is broadcast to every frame, so no-ops are pure waste.
	 */
	async recordWrites() {
		await (
			await this.worker()
		).evaluate(() => {
			if (globalThis.__gsWrites) {
				globalThis.__gsWrites.length = 0
				return
			}
			const writes = (globalThis.__gsWrites = [])
			const area = chrome.storage.local
			const set = area.set.bind(area)
			const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
			area.set = async (items, ...rest) => {
				const keys = Object.keys(items).filter((k) => k !== "changeId")
				const before = await area.get(keys)
				const noop = keys.length ? keys.filter((k) => same(items[k], before[k])) : ["(only changeId)"]
				writes.push({ keys, noop, stack: noop.length ? new Error().stack.split("\n").slice(2, 6).join("\n") : undefined })
				return set(items, ...rest)
			}
		})
	}

	/** Writes recorded since recordWrites(). Gone if the worker restarted since. */
	async writes() {
		return (await this.worker()).evaluate(() => globalThis.__gsWrites ?? [])
	}

	/** Stops the service worker, as Chrome does after it idles. The next extension event starts a fresh one. */
	async stopWorker() {
		const page = this.context.pages()[0] ?? (await this.context.newPage())
		const cdp = await this.context.newCDPSession(page)
		// Playwright keeps the Worker object (it reattaches when the worker restarts) and only reports it
		// closed on shutdown, so wait for the protocol's own status instead.
		const stopped = new Promise((ok) =>
			cdp.on("ServiceWorker.workerVersionUpdated", ({ versions }) => {
				if (versions.some((v) => v.scriptURL.endsWith("/background.js") && v.runningStatus === "stopped")) ok()
			}),
		)
		await cdp.send("ServiceWorker.enable")
		await cdp.send("ServiceWorker.stopAllWorkers")
		await stopped
		await cdp.detach()
	}

	async close() {
		await this.context.close()
		rmSync(this.userDataDir, { recursive: true, force: true })
	}
}

/**
 * The first frame (top or nested) whose media is playing, so the content script there has found it.
 * Fixture pages expose `getMedia()`, which may reach into a shadow root.
 */
export async function playingFrame(page) {
	return waitFor(
		async () => {
			for (const frame of page.frames()) {
				const playing = await frame.evaluate(() => {
					const media = window.getMedia?.()
					return !!media && !media.paused && media.currentTime > 0
				})
				if (playing) return frame
			}
		},
		{ message: "playing media" },
	)
}

/** Reads a property of the fixture's media inside `frame`. */
export async function mediaProp(frame, prop) {
	return frame.evaluate((prop) => window.getMedia()[prop], prop)
}
