import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const settle = () => new Promise((resolve) => setImmediate(resolve))
const deferred = () => {
	let resolve
	const promise = new Promise((res) => (resolve = res))
	return { promise, resolve }
}

function eventChannel() {
	const listeners = new Set()
	return {
		addListener: (cb) => listeners.add(cb),
		removeListener: (cb) => listeners.delete(cb),
		emit: (...args) => Promise.all([...listeners].map((cb) => cb(...args))),
	}
}

let nextId = 0

function startupEnv({ pinned = false, overrides = {} } = {}) {
	const data = {
		"g:version": 15,
		"g:enabled": true,
		"g:speed": 1.5,
		"g:pinByDefault": true,
		"g:initialContext": 1,
		"t:1:enabled": true,
		"t:1:speed": 1.5,
		...(pinned ? { "t:1:isPinned": true } : {}),
		...overrides,
	}
	const gvar = {}
	const errors = []
	const onChanged = eventChannel()
	let releaseRemoval
	const removalGate = new Promise((res) => (releaseRemoval = res))
	const pendingEvents = []
	const dispatch = (changes) => pendingEvents.push(() => onChanged.emit(changes))
	const chrome = {
		runtime: { onInstalled: eventChannel(), onStartup: eventChannel(), onMessage: eventChannel(), onConnect: eventChannel() },
		tabs: {
			onCreated: eventChannel(),
			onRemoved: eventChannel(),
			query: async (query) => (query.audible || query.url ? [] : [{ id: 1 }]),
		},
		storage: {
			local: {
				onChanged,
				get: async (keys) => {
					if (keys == null) return { ...data }
					return Object.fromEntries(
						(typeof keys === "string" ? [keys] : keys).filter((key) => Object.hasOwn(data, key)).map((key) => [key, data[key]]),
					)
				},
				set: async (override) => {
					const changes = {}
					for (const [key, value] of Object.entries(override)) {
						if (value === undefined || data[key] === value) continue
						changes[key] = { oldValue: data[key], newValue: value }
						data[key] = value
					}
					dispatch(changes)
				},
				remove: async (keys) => {
					await removalGate
					const changes = {}
					for (const key of keys) {
						if (!Object.hasOwn(data, key)) continue
						changes[key] = { oldValue: data[key] }
						delete data[key]
					}
					dispatch(changes)
				},
			},
			session: {},
			AccessLevel: { TRUSTED_AND_UNTRUSTED_CONTEXTS: "all" },
		},
	}
	const stubs = {
		"@/globalVar": { gvar },
		"lodash.debounce": (cb) => cb,
		"@/utils/helper": {
			isMobile: () => true,
			randomId: () => String(++nextId),
			listToDict: (keys, value) => Object.fromEntries(keys.map((key) => [key, value])),
		},
		"@/defaults": { getDefaultContext: () => ({ enabled: true, speed: 1 }), getDefaultState: () => ({ version: 15 }) },
		"@/utils/buildFlags": { IS_FIREFOX_BUILD: true },
		"@/utils/contextMenus": { syncContextMenu() {} },
		"@/background/utils/migrateSchema": { migrateSchema: (config) => config },
		"./badge": {},
		"./rules": {},
		"notFirefox/background/capture": {},
		"@/utils/browserUtils": {},
		"@/utils/configUtils": {},
		"@/utils/gsm": {},
		"./utils/getAutoMedia": {},
		"./utils/processKeybinds": {},
		"./utils/promo": { handlePromo() {} },
	}
	const modules = new Map()
	function load(path) {
		if (modules.has(path)) return modules.get(path)
		const exports = {}
		modules.set(path, exports)
		const { outputText } = ts.transpileModule(readFileSync(resolve(import.meta.dirname, "../..", path), "utf8"), {
			compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
		})
		runInNewContext(outputText, {
			exports,
			chrome,
			console: { ...console, error: (error) => errors.push(error) },
			IS_DEV_BUILD: false,
			setTimeout: () => {},
			require: (name) => {
				if (name in stubs) return stubs[name]
				if (name === "./contextMenus") return stubs["@/utils/contextMenus"]
				if (name.startsWith("@/")) return load(`src/${name.slice(2)}.ts`)
				if (name.startsWith("./")) return load(`src/background/${name.slice(2)}.ts`)
				throw new Error(`Missing dependency: ${name}`)
			},
		})
		return exports
	}
	load("src/background/index.ts")
	const state = load("src/utils/state.ts")
	return {
		gvar,
		errors,
		data,
		state,
		chrome,
		releaseRemoval,
		flushOne: () => pendingEvents.shift()(),
		async flush() {
			while (pendingEvents.length) {
				await pendingEvents.shift()()
				await settle()
			}
		},
	}
}

test("startup finishes cleaning old tab state before restoring default pins", async () => {
	const env = startupEnv({ pinned: true })
	await env.gvar.es.init()
	const startup = env.chrome.runtime.onStartup.emit()
	await settle()
	// Hold cleanup while the old code starts pin restoration concurrently.
	env.releaseRemoval()
	await startup
	await settle()
	await env.flush()
	assert.equal(env.data["t:1:isPinned"], true)
	assert.equal(env.data["t:1:enabled"], true)
	const view = await env.state.fetchView(["enabled", "speed", "isPinned"], 1)
	assert.equal(view.enabled, true)
	assert.equal(view.isPinned, true)
	assert.equal(view.speed, 1.5)
})

for (const hasGetKeys of [true, false]) {
	test(`config export only includes global settings (${hasGetKeys ? "getKeys" : "legacy fallback"})`, async () => {
		const env = startupEnv({ overrides: { "g:hideBadge": null, "f:salt": "private", "s:captured": [1] } })
		const get = env.chrome.storage.local.get
		let reads = 0
		if (hasGetKeys) env.chrome.storage.local.getKeys = async () => Object.keys(env.data)
		env.chrome.storage.local.get = async (keys) => {
			reads++
			if (hasGetKeys) {
				assert.ok(Array.isArray(keys))
				assert.ok(
					keys.every((key) => key.startsWith("g:")),
					"tab and session values must not be fetched",
				)
			}
			return get(keys)
		}
		const config = await env.state.dumpConfig()
		assert.deepEqual(JSON.parse(JSON.stringify(config)), {
			version: 15,
			enabled: true,
			speed: 1.5,
			pinByDefault: true,
			initialContext: 1,
			hideBadge: null,
		})
		assert.equal(reads, 1)
	})
}

test("a previous-tab context remains complete after reload cleanup and is inherited by a new tab", async () => {
	const env = startupEnv()
	await env.gvar.es.init()
	env.releaseRemoval()
	await env.chrome.runtime.onStartup.emit()
	await settle()
	await env.flush()
	const view = await env.state.fetchView(["enabled", "speed", "isPinned"], 1)
	assert.equal(view.enabled, env.data["t:1:enabled"])
	assert.equal(view.enabled, true)
	await env.chrome.tabs.onCreated.emit({ id: 2, openerTabId: 1 })
	await settle()
	await env.flush()
	assert.equal(env.data["t:2:isPinned"], true)
	assert.equal(env.data["t:2:enabled"], true)
	assert.equal(env.data["t:2:speed"], 1.5)
})

test("a tab opened during startup waits for its opener's restored context", async () => {
	const env = startupEnv({ pinned: true, overrides: { "t:1:enabled": false, "t:1:speed": 3 } })
	await env.gvar.es.init()
	const startup = env.chrome.runtime.onStartup.emit()
	const created = env.chrome.tabs.onCreated.emit({ id: 2, openerTabId: 1 })
	await settle()
	assert.equal(env.data["t:2:isPinned"], undefined)
	env.releaseRemoval()
	await Promise.all([startup, created])
	await env.flush()
	assert.equal(env.data["t:2:enabled"], true)
	assert.equal(env.data["t:2:speed"], 1.5)
})

test("repeated install/reload events keep storage and the background context in sync", async () => {
	let overrides = {}
	for (let reload = 0; reload < 3; reload++) {
		const env = startupEnv({ overrides })
		await env.gvar.es.init()
		env.releaseRemoval()
		await env.chrome.runtime.onInstalled.emit()
		await env.flush()
		const view = await env.state.fetchView(["enabled", "speed", "isPinned"], 1)
		assert.equal(env.data["t:1:isPinned"], true)
		assert.equal(view.isPinned, true)
		assert.equal(view.enabled, true)
		assert.equal(view.speed, 1.5)
		overrides = { ...env.data }
	}
})

test("previous-tab inheritance preserves a deliberately disabled context", async () => {
	const env = startupEnv({ overrides: { "g:enabled": false } })
	env.releaseRemoval()
	await env.chrome.runtime.onStartup.emit()
	await env.flush()
	await env.chrome.tabs.onCreated.emit({ id: 2, openerTabId: 1 })
	await env.flush()
	const view = await env.state.fetchView(["enabled", "isPinned"], 2)
	assert.equal(view.isPinned, true)
	assert.equal(view.enabled, false)
	assert.equal(env.data["t:2:enabled"], false)
})

test("delayed storage events cannot roll back newer writes, but later external edits still apply", async () => {
	const env = startupEnv({ pinned: true })
	await env.gvar.es.init()
	await env.chrome.storage.local.set({ "t:1:speed": 2, "g:hideBadge": true })
	await env.gvar.es.set({ "t:1:speed": 3 })
	await env.gvar.es.set({ "t:1:speed": 4 })
	await env.flushOne()
	let view = await env.state.fetchView(["speed", "hideBadge"], 1)
	assert.equal(view.speed, 4)
	assert.equal(view.hideBadge, true, "unrelated external changes must still be applied")
	await env.flushOne()
	assert.equal((await env.state.fetchView(["speed"], 1)).speed, 4)
	await env.flush()
	await env.chrome.storage.local.set({ "t:1:speed": 5 })
	await env.flush()
	assert.equal((await env.state.fetchView(["speed"], 1)).speed, 5)
})

test("a failed storage write does not keep masking later external changes", async () => {
	const env = startupEnv({ pinned: true })
	const set = env.chrome.storage.local.set
	env.chrome.storage.local.set = async () => {
		throw new Error("Storage unavailable")
	}
	await assert.rejects(env.gvar.es.set({ "t:1:speed": 3, "g:hideBadge": true }), /Storage unavailable/)
	assert.equal((await env.state.fetchView(["speed"], 1)).speed, 1.5, "failed writes restore persisted values immediately")
	assert.equal(Object.hasOwn(await env.gvar.es.get(), "g:hideBadge"), false, "failed additions are removed")
	env.chrome.storage.local.set = set
	await set({ "t:1:speed": 2 })
	await env.flush()
	assert.equal((await env.state.fetchView(["speed"], 1)).speed, 2)
})

test("recovery cannot overwrite a newer write made while its storage read is in flight", async () => {
	const env = startupEnv({ pinned: true })
	await env.gvar.es.init()
	const get = env.chrome.storage.local.get
	const set = env.chrome.storage.local.set
	const gate = deferred()
	env.chrome.storage.local.get = async (keys) => {
		const snapshot = await get(keys)
		await gate.promise
		return snapshot
	}
	env.chrome.storage.local.set = async () => {
		throw new Error("Failed write")
	}
	const failed = assert.rejects(env.gvar.es.set({ "t:1:speed": 3, "g:hideBadge": true }), /Failed write/)
	await settle()
	env.chrome.storage.local.set = set
	await env.gvar.es.set({ "t:1:speed": 4 })
	await env.flush()
	gate.resolve()
	await failed
	assert.equal((await env.state.fetchView(["speed"], 1)).speed, 4)
	assert.equal(Object.hasOwn(await env.gvar.es.get(), "g:hideBadge"), false)
})

test("recovery preserves another pending write whose echo has not arrived", async () => {
	const env = startupEnv({ pinned: true })
	await env.gvar.es.set({ "t:1:speed": 2 })
	env.chrome.storage.local.set = async () => {
		throw new Error("Failed write")
	}
	await assert.rejects(env.gvar.es.set({ "t:1:speed": 3 }), /Failed write/)
	assert.equal((await env.state.fetchView(["speed"], 1)).speed, 2)
	await env.flush()
	assert.equal((await env.state.fetchView(["speed"], 1)).speed, 2)
})

test("throwing and rejecting watchers cannot block persistence or other watchers", async () => {
	const env = startupEnv({ pinned: true })
	const seen = []
	env.gvar.es.addWatcher(["t:1:speed"], () => {
		throw new Error("Sync watcher")
	})
	env.gvar.es.addWatcher(["t:1:speed"], async () => {
		throw new Error("Async watcher")
	})
	env.gvar.es.addWatcher(["t:1:speed"], (changes) => seen.push(changes["t:1:speed"].newValue))
	await env.gvar.es.set({ "t:1:speed": 3 })
	await env.flush()
	assert.equal(env.data["t:1:speed"], 3)
	assert.deepEqual(seen, [3])
	await env.chrome.storage.local.set({ "t:1:speed": 4 })
	await env.flush()
	assert.equal((await env.state.fetchView(["speed"], 1)).speed, 4)
	assert.deepEqual(seen, [3, 4])
	assert.equal(env.errors.length, 4)
})

test("new tabs share a retry after cleanup fails instead of remaining blocked", async () => {
	const env = startupEnv({ pinned: true })
	env.releaseRemoval()
	const remove = env.chrome.storage.local.remove
	let attempts = 0
	env.chrome.storage.local.remove = async (keys) => {
		if (++attempts === 1) throw new Error("Cleanup failed")
		return remove(keys)
	}
	await assert.rejects(env.chrome.runtime.onStartup.emit(), /Cleanup failed/)
	await Promise.all([env.chrome.tabs.onCreated.emit({ id: 2, openerTabId: 1 }), env.chrome.tabs.onCreated.emit({ id: 3, openerTabId: 1 })])
	await env.flush()
	assert.equal(attempts, 2)
	for (const id of [1, 2, 3]) {
		assert.equal(env.data[`t:${id}:isPinned`], true)
		assert.equal(env.data[`t:${id}:enabled`], true)
	}
})

test("a partial restoration retry keeps completed cleanup and restored tabs intact", async () => {
	const env = startupEnv({ pinned: true })
	env.releaseRemoval()
	env.chrome.tabs.query = async () => [{ id: 1 }, { id: 2 }]
	const set = env.chrome.storage.local.set
	const remove = env.chrome.storage.local.remove
	let removals = 0
	env.chrome.storage.local.remove = async (keys) => {
		removals++
		return remove(keys)
	}
	env.chrome.storage.local.set = async (override) => {
		if (override["t:2:isPinned"]) throw new Error("Pin failed")
		return set(override)
	}
	await assert.rejects(env.chrome.runtime.onStartup.emit(), /Pin failed/)
	await env.flush()
	await env.state.pushView({ tabId: 1, override: { speed: 3, enabled: false } })
	await env.flush()
	env.chrome.storage.local.set = set
	await env.chrome.tabs.onCreated.emit({ id: 3, openerTabId: 1 })
	await env.flush()
	assert.equal(removals, 1, "completed cleanup must not erase successful pins on retry")
	assert.equal(env.data["t:1:speed"], 3)
	assert.equal(env.data["t:1:enabled"], false)
	assert.equal(env.data["t:2:isPinned"], true)
	assert.equal(env.data["t:3:speed"], 3)
	assert.equal(env.data["t:3:enabled"], false)
})

test("a failed install can retry migration before a later tab inherits context", async () => {
	const env = startupEnv({ pinned: true })
	env.releaseRemoval()
	const set = env.chrome.storage.local.set
	env.chrome.storage.local.set = async () => {
		throw new Error("Migration failed")
	}
	await assert.rejects(env.chrome.runtime.onInstalled.emit(), /Migration failed/)
	env.chrome.storage.local.set = set
	await env.chrome.tabs.onCreated.emit({ id: 2, openerTabId: 1 })
	await env.flush()
	assert.equal(env.data["t:2:isPinned"], true)
	assert.equal(env.data["t:2:enabled"], true)
})
