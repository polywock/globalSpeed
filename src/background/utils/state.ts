import { gvar } from "@/globalVar"
import { AnyDict } from "@/types"
import { randomId } from "@/utils/helper"

declare global {
	interface GlobalVar {
		es: EntireState
	}
}

type WatcherInit = [watchKeys: (string | RegExp | RegExp["test"])[], callback: (changes: chrome.storage.StorageChanges) => void]

/** Used in service worker to keep the latest storage state  */
export class EntireState {
	watchers: WatcherInit[] = []
	private rawMap?: AnyDict
	loadRawMapPromise: Promise<void> | undefined = undefined
	stateReadyCbs: Set<() => void> = new Set()
	private pendingChanges: Map<string, chrome.storage.StorageChanges> = new Map()
	private reconciliations: Set<Set<string>> = new Set()
	released = false

	constructor() {
		chrome.storage.local.onChanged.addListener(this.handleChange)
	}
	init = async () => {
		if (!this.rawMap) await this.ensureRawMapLoaded()
		if (!this.rawMap) throw Error("Raw map could not be loaded")
	}
	ensureRawMapLoaded = async () => {
		if (!this.loadRawMapPromise) {
			this.loadRawMapPromise = (async () => {
				await gvar.installPromise
				this.rawMap = await chrome.storage.local.get()
				this.flushStateReadyCbs()
			})().catch((err) => {
				this.loadRawMapPromise = undefined
				throw err
			})
		}
		await this.loadRawMapPromise
	}
	/** Runs cb once the raw map is loaded, immediately if it already is. */
	onStateReady = (cb: () => void) => {
		this.rawMap ? cb() : this.stateReadyCbs.add(cb)
	}
	flushStateReadyCbs = () => {
		const cbs = this.stateReadyCbs
		this.stateReadyCbs = new Set()
		for (let cb of cbs) {
			try {
				cb()
			} catch (err) {
				console.error(err)
			}
		}
	}
	addWatcher = (watchKeys: WatcherInit[0], cb: WatcherInit[1]) => {
		this.watchers.push([watchKeys, cb])
	}
	removeWatcher = (cb: WatcherInit[1]) => {
		const idx = this.watchers.findIndex((w) => w[1] === cb)
		if (idx >= 0) {
			this.watchers.splice(idx, 1)
		}
	}
	handleChange = async (changes: chrome.storage.StorageChanges) => {
		await this.init()

		changes = changes ?? {}
		const changeId = changes["changeId"]?.newValue as string

		if (changeId && this.pendingChanges.delete(changeId)) return

		// Assuming storage events follow write order, they can trail our optimistic writes.
		// Do not let an earlier cleanup erase a newer context while its echo is pending.
		const pendingKeys = new Set([...this.pendingChanges.values()].flatMap((pending) => Object.keys(pending)))
		changes = Object.fromEntries(Object.entries(changes).filter(([key]) => !pendingKeys.has(key)))
		this.applyChanges(changes)
	}
	private applyChanges = (changes: chrome.storage.StorageChanges) => {
		if (!Object.keys(changes).length) return
		for (let key in changes) {
			// A recovery read must not overwrite anything changed while it was in flight.
			for (const keys of this.reconciliations) keys.delete(key)
			if (Object.hasOwn(changes[key], "newValue")) {
				this.rawMap[key] = changes[key].newValue
			} else {
				delete this.rawMap[key]
			}
		}

		if (!this.rawMap["g:version"]) return

		const changeKeys = Object.keys(changes)
		const changeKeySet = new Set(changeKeys)

		this.watchers.forEach(([testers, cb]) => {
			try {
				if (this.testWatcher(changeKeys, changeKeySet, testers)) {
					Promise.resolve(cb(changes)).catch((err) => console.error(err))
				}
			} catch (err) {
				console.error(err)
			}
		})
	}
	private reconcile = async (failedChanges: chrome.storage.StorageChanges) => {
		const keys = new Set(Object.keys(failedChanges))
		this.reconciliations.add(keys)
		try {
			const stored = await chrome.storage.local.get([...keys])
			// Keep any surviving optimistic writes, including ones awaiting their echo.
			for (const pending of this.pendingChanges.values()) {
				for (const key of keys) {
					if (pending[key]) stored[key] = pending[key].newValue
				}
			}
			const changes: chrome.storage.StorageChanges = {}
			for (const key of keys) {
				changes[key] = Object.hasOwn(stored, key) ? { oldValue: this.rawMap[key], newValue: stored[key] } : { oldValue: this.rawMap[key] }
			}
			this.applyChanges(changes)
		} finally {
			this.reconciliations.delete(keys)
		}
	}
	testWatcher = (changeKeys: string[], changeKeysSet: Set<string>, testers: WatcherInit[0]) => {
		if (testers.length === 0) return true
		for (let tester of testers) {
			if (typeof tester === "function" || typeof (tester as RegExp)?.test === "function") {
				let t = ((tester as RegExp).test?.bind(tester) ?? tester) as RegExp["test"]
				const m = changeKeys.some((c) => t(c))
				if (m) return true
			} else if (typeof tester === "string") {
				const m = changeKeysSet.has(tester)
				if (m) return true
			}
		}
		return false
	}
	/** Get rawMap, same reference */
	getAllUnsafe = async () => {
		await this.init()
		return this.rawMap
	}
	get = async (keys?: string | string[] | AnyDict) => {
		await this.init()
		if (keys == null) return { ...this.rawMap }

		let output: AnyDict = {}

		if (typeof keys === "string") {
			keys = [keys]
		} else if (Array.isArray(keys)) {
		} else if (typeof keys === "object") {
			output = { ...keys }
			keys = Object.keys(output)
		}

		for (let key of keys as string[]) {
			if (Object.hasOwn(this.rawMap, key)) {
				output[key] = this.rawMap[key]
			}
		}

		return output
	}
	set = async (override: AnyDict) => {
		await this.init()

		const items: AnyDict = {}
		const changes = {} as chrome.storage.StorageChanges
		for (let key in override) {
			const value = override[key]
			if (value === undefined || key === "changeId") continue
			items[key] = value
			changes[key] = { newValue: value, oldValue: this.rawMap[key] }
		}
		// Every write is broadcast to every frame of every tab, so skip one with nothing in it. Values aren't
		// compared to the cache: it trails writes made elsewhere until their change events arrive.
		if (!Object.keys(items).length) return

		const changeId = randomId()
		items["changeId"] = changeId
		changes["changeId"] = { newValue: changeId, oldValue: this.rawMap["changeId"] }

		this.pendingChanges.set(changeId, changes)
		this.applyChanges(changes)
		try {
			await chrome.storage.local.set(items)
		} catch (err) {
			this.pendingChanges.delete(changeId)
			await this.reconcile(changes)
			throw err
		}
	}
}

gvar.es = new EntireState()
