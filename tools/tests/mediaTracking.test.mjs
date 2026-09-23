import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import test from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const root = resolve(import.meta.dirname, "../..")
const require = createRequire(import.meta.url)

// Exercise the actual TypeScript modules with isolated browser dependencies.
// MEDIA_TEST_REVISION=HEAD runs the same regressions against the committed code.
function load(path, imports = {}, globals = {}) {
	const source = process.env.MEDIA_TEST_REVISION
		? execFileSync("git", ["show", `${process.env.MEDIA_TEST_REVISION}:${path}`], { cwd: root, encoding: "utf8" })
		: readFileSync(resolve(root, path), "utf8")
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
	})
	const exports = {}
	runInNewContext(outputText, {
		exports,
		require: (name) => {
			if (name in imports) return imports[name]
			if (name === "@/utils/mediaProgress") return load("src/utils/mediaProgress.ts")
			if (!name.startsWith(".") && !name.startsWith("@/")) return require(name)
			throw new Error(`Missing test dependency: ${name}`)
		},
		setTimeout,
		clearTimeout,
		...globals,
	})
	return exports
}

const deferred = () => {
	let resolve
	const promise = new Promise((res) => (resolve = res))
	return { promise, resolve }
}
const settle = () => new Promise((resolve) => setImmediate(resolve))
const tabInfo = { tabId: 1, frameId: 2, windowId: 1 }
const scopeKey = "m:scope:1:2"
const scope = (key = "video") => ({ tabInfo, media: [{ key, readyState: 4, duration: 600 }] })
const flattenMediaInfos = (scopes) => scopes.flatMap((scope) => scope.media.map((media) => ({ ...scope, ...media })))

function browserEnv({ frames = [{ frameId: 2 }], tab = {}, sendMessage = async () => true } = {}) {
	const data = { [scopeKey]: scope() }
	const removed = []
	const chrome = {
		tabs: {
			get: async () => {
				if (tab === null) throw new Error("Tab closed")
				return tab
			},
			sendMessage,
		},
		webNavigation: {
			getAllFrames: async () => {
				if (frames === null) throw new Error("Unavailable")
				return frames
			},
		},
		storage: {
			session: {
				get: async () => ({ ...data }),
				remove: async (key) => {
					removed.push(key)
					delete data[key]
				},
			},
		},
	}
	const browserUtils = load("src/utils/browserUtils.ts", {}, { chrome })
	return { chrome, browserUtils, data, removed }
}

function autoMedia(env) {
	return load(
		"src/background/utils/getAutoMedia.ts",
		{
			"@/contentScript/isolated/utils/genMediaInfo": { flattenMediaInfos },
			"@/utils/browserUtils": env.browserUtils,
			"@/utils/state": { fetchView: async () => ({}) },
		},
		{ chrome: env.chrome },
	).getAutoMedia
}

test("a failed liveness ping keeps a live frame available to the next shortcut", async () => {
	const env = browserEnv({
		sendMessage: async () => {
			throw new Error("Message channel closed")
		},
	})
	const getAutoMedia = autoMedia(env)
	assert.equal((await getAutoMedia(tabInfo)).key, "video")
	await settle()
	assert.deepEqual(env.removed, [])
	assert.equal((await getAutoMedia(tabInfo)).key, "video")
})

for (const [label, options, shouldRemove] of [
	["live frame", {}, false],
	["unknown frame status", { frames: null }, false],
	["frozen tab", { tab: { frozen: true }, frames: [] }, false],
	["removed frame", { frames: [] }, true],
	["closed tab", { tab: null }, true],
	["discarded tab", { tab: { discarded: true } }, true],
]) {
	test(`failed action delivery: ${label}`, async () => {
		const calls = []
		const env = browserEnv({
			...options,
			sendMessage: async (_tab, _msg, target) => {
				calls.push(target.frameId)
				throw new Error("Delivery failed")
			},
		})
		await env.browserUtils.sendToFrame(1, 2, { type: "APPLY_MEDIA_EVENT", key: "video" })
		assert.deepEqual(env.removed, shouldRemove ? [scopeKey] : [])
		if (!shouldRemove) assert.deepEqual(calls, [2], "do not replay an uncertain delivery in the top frame")
	})
}

test("resync waits for the video iframe even when the empty top frame answers first", async () => {
	const videoReply = deferred()
	const requests = []
	const env = browserEnv({
		frames: [{ frameId: 0 }, { frameId: 2 }],
		sendMessage: async (_tab, msg, target) => {
			if (msg.type !== "RESYNC_MEDIA") return true
			requests.push(target?.frameId)
			if (target?.frameId === 2) {
				await videoReply.promise
				env.data[scopeKey] = scope()
			}
			return true
		},
	})
	delete env.data[scopeKey]
	const result = autoMedia(env)(tabInfo)
	await settle()
	videoReply.resolve()
	assert.equal((await result)?.key, "video")
	assert.deepEqual(requests, [0, 2])
})

test("resync acknowledges only after the snapshot write completes", async () => {
	const write = deferred()
	const replies = []
	const { MessageTower } = load(
		"src/contentScript/isolated/MessageTower.ts",
		{
			"@/globalVar": { gvar: { os: { mediaTower: { sendUpdate: () => write.promise } } } },
			"./utils": {},
			"./utils/applyMediaEvent": {},
		},
		{ chrome: { runtime: { onMessage: { addListener() {} } } } },
	)
	const tower = new MessageTower()
	assert.equal(
		tower.handleMessage({ type: "RESYNC_MEDIA" }, {}, (result) => replies.push(result)),
		true,
	)
	await settle()
	assert.deepEqual(replies, [])
	write.resolve()
	await settle()
	assert.deepEqual(replies, [true])
})

test("an unresponsive frame cannot indefinitely stall a missing-media shortcut", async () => {
	const env = browserEnv({ sendMessage: () => new Promise(() => {}) })
	delete env.data[scopeKey]
	const result = autoMedia(env)(tabInfo)
	assert.equal(await result, undefined)
})

function watcherEnv() {
	const ping = deferred()
	const env = browserEnv()
	const listeners = new Set()
	env.chrome.storage.session.onChanged = {
		addListener: (cb) => listeners.add(cb),
		removeListener: (cb) => listeners.delete(cb),
	}
	const { SubscribeMedia } = load(
		"src/hooks/useMediaWatch.ts",
		{
			"@/globalVar": { gvar: {} },
			"@/utils/browserUtils": { checkContentScript: () => ping.promise, frameExists: async () => false },
			"../contentScript/isolated/utils/genMediaInfo": { flattenMediaInfos },
		},
		{ chrome: env.chrome },
	)
	const updates = []
	const watcher = new SubscribeMedia(1, (data) => updates.push(data))
	return { ...env, ping, listeners, watcher, updates, emit: (changes) => listeners.forEach((cb) => cb(changes)) }
}

test("MediaView retains media and pin changes received during its startup checks", async () => {
	const env = watcherEnv()
	await settle()
	env.emit({ [scopeKey]: { newValue: scope("replacement") }, "m:pin": { newValue: { key: "replacement", tabInfo } } })
	env.ping.resolve(true)
	await settle()
	assert.equal(env.watcher.latestData.infos[0].key, "replacement")
	assert.equal(env.watcher.latestData.pinned.key, "replacement")
	env.watcher.release()
})

test("MediaView does not resurrect a scope removed during startup", async () => {
	const env = watcherEnv()
	await settle()
	env.emit({ [scopeKey]: { oldValue: scope() } })
	env.ping.resolve(true)
	await settle()
	assert.equal(env.watcher.latestData.infos.length, 0)
	env.watcher.release()
})

test("MediaView does not evict a replacement snapshot after an old liveness check fails", async () => {
	const env = watcherEnv()
	await settle()
	env.emit({ [scopeKey]: { newValue: scope("replacement") } })
	env.ping.resolve(undefined)
	await settle()
	assert.deepEqual(env.removed, [])
	assert.equal(env.watcher.latestData.infos[0].key, "replacement")
	env.watcher.release()
})

test("closing MediaView during startup leaves no subscription or callback behind", async () => {
	const env = watcherEnv()
	await settle()
	env.watcher.release()
	env.ping.resolve(true)
	await settle()
	assert.equal(env.listeners.size, 0)
	assert.equal(env.updates.length, 0)
})

test("shadow media timeupdates publish after their Event target has been cleared", () => {
	class Media {
		volume = 1
		addEventListener() {}
		getRootNode() {
			return {}
		}
	}
	const writes = []
	const gvar = {
		tabInfo,
		os: { stratumServer: { wiggleCbs: new Set() }, detectOpen: { cbs: new Set() } },
	}
	const { MediaTower } = load(
		"src/contentScript/isolated/MediaTower.ts",
		{
			"@/globalVar": { gvar },
			"@/utils/IterableWeakSet": { IterableWeakSet: Set },
			"@/utils/nativeUtils": {},
			"../../utils/configUtils": {},
			"../../utils/helper": { assertType() {}, randomId: () => "video", between: () => true },
			"./utils/applyMediaEvent": {},
			"./utils/genMediaInfo": { generateScopeState: (_tab, media) => ({ volumes: media.map((m) => m.volume) }) },
		},
		{
			window: { addEventListener() {} },
			HTMLMediaElement: Media,
			HTMLVideoElement: class extends Media {},
			ShadowRoot: class {},
			chrome: { runtime: { id: "extension", onConnect: { addListener() {} } }, storage: { session: { set: (value) => writes.push(value) } } },
		},
	)
	const tower = new MediaTower()
	tower.trackFps = false
	const media = new Media()
	try {
		tower.handleMediaEventTimeUpdate({ target: media, type: "timeupdate", isTrusted: true })
		media.volume = 0.25
		const event = { target: media, type: "timeupdate", isTrusted: true }
		tower.handleMediaEventTimeUpdate(event)
		event.target = null // DOM dispatch clears non-composed shadow-tree event targets.
		const before = writes.length
		;(tower.sendTimeUpdateDeb ?? tower.handleMediaEventDeb).flush()
		assert.ok(writes.length > before, "the delayed snapshot must still be published")
		assert.equal(writes.at(-1)[scopeKey].volumes[0], 0.25)
	} finally {
		tower.sendTimeUpdateDeb?.cancel()
		tower.handleMediaEventDeb?.cancel()
		tower.sendUpdateDeb.cancel()
	}
})

function eventChannel() {
	const listeners = new Set()
	return {
		listeners,
		addListener: (cb) => listeners.add(cb),
		removeListener: (cb) => listeners.delete(cb),
		emit: (...args) => [...listeners].forEach((cb) => cb(...args)),
	}
}

function progressPort() {
	return {
		name: "media-progress",
		onMessage: eventChannel(),
		onDisconnect: eventChannel(),
		messages: [],
		disconnected: false,
		postMessage(message) {
			this.messages.push(message)
		},
		disconnect() {
			this.disconnected = true
		},
	}
}

test("progress clients share each frame port, route seeks, and clean up disappearing frames", () => {
	const ports = []
	const updates = []
	const chrome = {
		runtime: {},
		tabs: {
			connect: (tabId, options) => {
				const port = Object.assign(progressPort(), { tabId, ...options })
				ports.push(port)
				return port
			},
		},
	}
	const { MediaProgressClient } = load("src/hooks/useMediaProgress.ts", {}, { chrome })
	const client = new MediaProgressClient((value) => updates.push(value))
	const first = { key: "first", tabInfo }
	const sameFrame = { key: "second", tabInfo }
	const otherFrame = { key: "third", tabInfo: { ...tabInfo, frameId: 3 } }
	client.sync([first, sameFrame, otherFrame])
	client.sync([first, sameFrame, otherFrame])
	assert.equal(ports.length, 2)
	assert.deepEqual(
		ports.map((p) => p.frameId),
		[2, 3],
	)
	ports[0].onMessage.emit({ type: "PROGRESS", media: [{ key: "first", currentTime: 42, duration: 100 }] })
	assert.equal(updates.at(-1).first.currentTime, 42)
	client.seek(otherFrame, 75)
	assert.equal(ports[1].messages[0].key, "third")
	assert.equal(ports[1].messages[0].time, 75)
	assert.equal(ports[0].messages.length, 0)
	client.sync([otherFrame])
	assert.equal(ports[0].disconnected, true)
	assert.equal(ports[0].onMessage.listeners.size, 0)
	assert.equal(updates.at(-1).first, undefined)
	ports[1].onDisconnect.emit()
	assert.equal(ports[1].onMessage.listeners.size, 0)
	assert.deepEqual(Object.keys(updates.at(-1)), [])
	client.sync([otherFrame]) // A newly discovered document can reconnect after navigation.
	assert.equal(ports.length, 3)
	client.sync([]) // Disabling the setting closes the remaining subscription.
	assert.equal(ports[2].disconnected, true)
	client.sync([first])
	client.release()
	assert.equal(ports[3].disconnected, true)
	assert.equal(ports[3].onDisconnect.listeners.size, 0)
})

test("MediaTower streams time without extra storage writes and stops after the last port closes", () => {
	class Media {
		gsKey = "video"
		currentTime = 12
		duration = 100
		readyState = 4
		addEventListener() {}
		getRootNode() {
			return {}
		}
	}
	const onConnect = eventChannel()
	const writes = []
	const seeks = []
	const { MediaTower } = load(
		"src/contentScript/isolated/MediaTower.ts",
		{
			"@/globalVar": { gvar: { tabInfo, os: { stratumServer: { wiggleCbs: new Set() }, detectOpen: { cbs: new Set() } } } },
			"@/utils/IterableWeakSet": { IterableWeakSet: Set },
			"@/utils/nativeUtils": {},
			"../../utils/configUtils": {},
			"../../utils/helper": { assertType() {}, randomId: () => "video" },
			"./utils/applyMediaEvent": {
				applyMediaEvent: (media, event) => {
					media.currentTime = event.value
					seeks.push(event)
				},
			},
			"./utils/genMediaInfo": { generateScopeState: () => ({}) },
		},
		{
			window: { addEventListener() {} },
			HTMLMediaElement: Media,
			HTMLVideoElement: class extends Media {},
			ShadowRoot: class {},
			chrome: { runtime: { id: "extension", onConnect }, storage: { session: { set: (value) => writes.push(value) } } },
		},
	)
	const tower = new MediaTower()
	tower.trackFps = false
	const media = new Media()
	tower.media.add(media)
	const first = progressPort()
	const second = progressPort()
	try {
		onConnect.emit(first)
		onConnect.emit(second)
		assert.equal(first.messages[0].media[0].currentTime, 12, "paused media is sent immediately on connection")
		assert.equal(first.messages.length, 1, "opening another popup does not rebroadcast to existing clients")
		tower.handleMediaEventTimeUpdate({ target: media, type: "timeupdate", isTrusted: true })
		const baselineWrites = writes.length
		for (let current = 13; current <= 20; current++) {
			media.currentTime = current
			const event = { target: media, type: "timeupdate", isTrusted: true }
			tower.handleMediaEventTimeUpdate(event)
			event.target = null
		}
		tower.sendProgressDeb.flush()
		assert.equal(first.messages.at(-1).media[0].currentTime, 20)
		assert.equal(writes.length, baselineWrites, "granular progress must not publish more storage snapshots")
		first.onMessage.emit({ type: "SEEK", key: "video", time: 200 })
		assert.equal(seeks.at(-1).value, 100)
		first.onMessage.emit({ type: "SEEK", key: "missing", time: 40 })
		first.onMessage.emit({ type: "SEEK", key: "video", time: NaN })
		assert.equal(seeks.length, 1)
		media.duration = Infinity
		tower.handleProgressEvent({ target: media, type: "durationchange", isTrusted: true })
		tower.sendProgressDeb.flush()
		assert.equal(first.messages.at(-1).media[0].duration, null)
		first.onMessage.emit({ type: "SEEK", key: "video", time: 30 })
		assert.equal(seeks.length, 1, "live media is not sought using a finite timeline")
		first.onDisconnect.emit()
		const firstCount = first.messages.length
		media.currentTime = 45
		tower.handleProgressEvent({ target: media, type: "seeked", isTrusted: true })
		tower.sendProgressDeb.flush()
		assert.equal(first.messages.length, firstCount)
		assert.equal(second.messages.at(-1).media[0].currentTime, 45)
		second.onDisconnect.emit()
		const secondCount = second.messages.length
		tower.handleProgressEvent({ target: media, type: "seeked", isTrusted: true })
		tower.sendProgressDeb.flush()
		assert.equal(second.messages.length, secondCount)
		assert.equal(tower.progressPorts.size, 0)
		assert.equal(first.onMessage.listeners.size, 0)
		assert.equal(writes.length, baselineWrites)
	} finally {
		tower.sendProgressDeb.cancel()
		tower.sendTimeUpdateDeb.cancel()
		tower.sendUpdateDeb.cancel()
	}
})
