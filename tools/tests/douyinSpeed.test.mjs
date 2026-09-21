import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"

function load(path, imports, globals) {
	const source = readFileSync(resolve(import.meta.dirname, "../..", path), "utf8")
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
	})
	const exports = {}
	runInNewContext(outputText, {
		exports,
		require(name) {
			if (!(name in imports)) throw new Error(`Missing import: ${name}`)
			return imports[name]
		},
		...globals,
	})
	return exports
}

function adapterEnv() {
	class MediaStream {}
	class Media {
		srcObject = new MediaStream()
		playbackRate = 1 // Independent of the decoder, just like the affected player.
	}
	class Core {
		_media = new Media()
		rate = 1
		writes = []
		get playbackRate() {
			return this.rate
		}
		set playbackRate(rate) {
			this.rate = rate
			this.writes.push(rate)
			// Douyin's custom player event resets rates above 3x through this setter.
			if (rate > 3) this.playbackRate = 1
		}
	}
	const roots = []
	const listeners = new Map()
	const document = {
		querySelectorAll: () => roots,
		addEventListener: (type, cb) => listeners.set(type, cb),
		removeEventListener: (type) => listeners.delete(type),
	}
	const { DouyinSpeed } = load("src/contentScript/main/utils/DouyinSpeed.ts", {}, { document, HTMLMediaElement: Media, MediaStream })
	const add = (core = new Core()) => {
		const root = { _player: { proxy: { _core: core } }, contains: (media) => media === core._media }
		roots.push(root)
		return { core, root }
	}
	return { adapter: new DouyinSpeed(), roots, listeners, add, Core }
}

test("decoder speed survives the site's >3x reset and later speed changes", () => {
	const { adapter, add } = adapterEnv()
	const { core } = add()
	adapter.update(4)
	assert.equal(core.playbackRate, 4)
	assert.equal(core._media.playbackRate, 1, "the adapter must control the decoder, not the video property")
	core.playbackRate = 1
	adapter.update(4)
	assert.deepEqual(core.writes, [4], "matching rates must not produce a ratechange feedback loop")
	adapter.update(0.5)
	assert.equal(core.playbackRate, 0.5)
	adapter.update(2)
	assert.equal(core.playbackRate, 2)
})

test("new players are handled on playback, and removed or native players are unlocked", () => {
	const { adapter, add, roots, listeners } = adapterEnv()
	adapter.update(2)
	const { core } = add()
	listeners.get("play")()
	assert.equal(core.playbackRate, 2)
	core._media.srcObject = null
	adapter.update(2)
	assert.equal(Object.hasOwn(core, "playbackRate"), false)
	core.playbackRate = 1.5
	assert.equal(core.playbackRate, 1.5)
	const replacement = add().core
	listeners.get("loadedmetadata")()
	assert.equal(replacement.playbackRate, 2)
	roots.length = 0
	adapter.update(2)
	assert.equal(Object.hasOwn(replacement, "playbackRate"), false)
})

test("disable restores the exact accessor and removes playback hooks", () => {
	const { adapter, add, Core, listeners } = adapterEnv()
	const { core } = add()
	const descriptor = { ...Object.getOwnPropertyDescriptor(Core.prototype, "playbackRate"), enumerable: true }
	Object.defineProperty(core, "playbackRate", descriptor)
	adapter.update(2)
	adapter.update(null)
	assert.deepEqual(Object.getOwnPropertyDescriptor(core, "playbackRate"), descriptor)
	assert.equal(listeners.size, 0)
	core.playbackRate = 1.5
	assert.equal(core.playbackRate, 1.5)
	adapter.update(4)
	assert.equal(core.playbackRate, 4, "re-enabling must not wrap an old guard")
	adapter.release()
})

test("native, revoked, unsupported, and throwing players do not break a healthy decoder", () => {
	const { adapter, add, roots } = adapterEnv()
	const native = add().core
	native._media.srcObject = null
	const revoked = Proxy.revocable({}, {})
	revoked.revoke()
	roots.push({ _player: revoked })
	const unsupported = add().core
	Object.defineProperty(unsupported, "playbackRate", { value: 1, configurable: false })
	const throwing = add().core
	const descriptor = {
		configurable: true,
		get: () => 1,
		set: () => {
			throw new Error("destroyed")
		},
	}
	Object.defineProperty(throwing, "playbackRate", descriptor)
	const healthy = add().core
	adapter.update(2)
	assert.equal(native.playbackRate, 1)
	assert.equal(unsupported.playbackRate, 1)
	assert.deepEqual(Object.getOwnPropertyDescriptor(throwing, "playbackRate"), { ...descriptor, enumerable: false })
	assert.equal(healthy.playbackRate, 2)
})

test("release does not overwrite a replacement accessor installed by the page", () => {
	const { adapter, add } = adapterEnv()
	const { core } = add()
	adapter.update(2)
	Object.defineProperty(core, "playbackRate", { value: 1.25, configurable: true })
	adapter.release()
	assert.equal(core.playbackRate, 1.25)
})

test("invalid bridge rates cannot install a lock", () => {
	const { adapter, add, listeners } = adapterEnv()
	const { core } = add()
	for (const rate of [undefined, "2", NaN, Infinity, 0, -1, 17]) adapter.update(rate)
	assert.equal(Object.hasOwn(core, "playbackRate"), false)
	assert.equal(listeners.size, 0)
})

function syncEnv({ douyin = true, initialized = true } = {}) {
	const messages = []
	const intervals = new Map()
	const timeouts = []
	const server = { initialized, initCbs: new Set(), send: (msg) => messages.push(msg) }
	const tower = { forceSpeedCallbacks: new Set(), applySpeedToAll() {} }
	const events = { addEventListener() {}, removeEventListener() {} }
	let id = 0
	const { SpeedSync } = load(
		"src/contentScript/isolated/SpeedSync.ts",
		{
			"@/globalVar": { gvar: { os: { stratumServer: server, mediaTower: tower } } },
			"@/utils/configUtils": { conformSpeed: (speed) => Math.max(0.07, Math.min(16, Math.round(speed * 100) / 100)) },
			"@/utils/helper": { between: (a, b, value) => value >= a && value <= b },
			"../douyin": { IS_DOUYIN: douyin },
		},
		{
			window: events,
			document: events,
			setInterval: (cb) => {
				intervals.set(++id, cb)
				return id
			},
			clearInterval: (id) => intervals.delete(id),
			setTimeout: (cb) => timeouts.push(cb),
		},
	)
	const sync = new SpeedSync()
	sync.latest = { speed: 2, freePitch: false }
	return { sync, server, messages, tower, intervals, timeouts }
}

test("bridge uses the latest effective speed for keyboard and pointer holds", () => {
	const { sync, messages } = syncEnv()
	sync.update()
	assert.equal(messages.at(-1).speed, 2)
	sync.latest.speed = 3
	sync.update()
	assert.equal(messages.at(-1).speed, 3)
	sync.processTemporarySpeed(2)
	assert.equal(messages.at(-1).speed, 6)
	sync.handleKeyUp()
	assert.equal(messages.at(-1).speed, 3)
	sync.holdToSpeed = 2
	sync.pointerDownAt = Date.now() - 700
	sync.realize()
	assert.equal(messages.at(-1).speed, 6)
	sync.clearPointerDown()
	assert.equal(messages.at(-1).speed, 3)
	sync.processTemporarySpeed(10)
	assert.equal(messages.at(-1).speed, 16)
})

test("bridge initialization sends current state, including disable, rather than stale speed", () => {
	const { sync, server, messages } = syncEnv({ initialized: false })
	sync.update()
	sync.processTemporarySpeed(2)
	assert.equal(messages.length, 0)
	for (const cb of server.initCbs) cb()
	assert.equal(messages.at(-1).speed, 4)
	delete sync.latest
	sync.update()
	for (const cb of server.initCbs) cb()
	assert.equal(messages.at(-1).speed, null)
})

test("release removes pending callbacks and cannot reactivate from an old hold timer", () => {
	const { sync, server, messages, tower, intervals, timeouts } = syncEnv()
	sync.update()
	sync.setPointerDownToNow()
	sync.release()
	const count = messages.length
	for (const cb of timeouts) cb()
	assert.equal(messages.length, count)
	assert.equal(messages.at(-1).speed, null)
	assert.equal(tower.forceSpeedCallbacks.size, 0)
	assert.equal(intervals.size, 0)
	server.initialized = false
	sync.latest = { speed: 2, freePitch: false }
	sync.update()
	sync.release()
	assert.equal(server.initCbs.size, 0)
})

test("other hosts do not send Douyin bridge messages", () => {
	const { sync, messages, server } = syncEnv({ douyin: false })
	sync.update()
	sync.processTemporarySpeed(2)
	sync.release()
	assert.equal(messages.length, 0)
	assert.equal(server.initCbs.size, 0)
})
