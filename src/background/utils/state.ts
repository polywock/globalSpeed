import { AnyDict } from "src/types"
import { randomId } from "src/utils/helper"

declare global {
    interface GlobalVar {
      es: EntireState,
      init: () => Promise<void> 
    }
}

type WatcherInit = [
    watchKeys: (string | RegExp | RegExp["test"])[],
    callback: (changes: chrome.storage.StorageChanges) => void
]

/** Used in service worker to keep the latest storage.session state  */
export class EntireState {
    watchers: WatcherInit[] = []
    private rawMap?: AnyDict
    processedChangeIds: Set<string> = new Set() 
    released = false 

    constructor() {
        chrome.storage.local.onChanged.addListener(this.handleChange)
    }
    init = async () => {
        if (!this.rawMap) {
            await gvar.installPromise
            this.rawMap = await chrome.storage.local.get()
        }

        if (!this.rawMap) throw Error("Raw map could not be loaded")
    }
    addWatcher = (watchKeys: WatcherInit[0], cb: WatcherInit[1]) => {
        this.watchers.push([watchKeys, cb])
    }
    removeWatcher = (cb: WatcherInit[1]) => {
        const idx = this.watchers.findIndex(w => w[1] === cb)
        if (idx >= 0) {
            this.watchers.splice(idx, 1)
        }
    }
    handleChange = async (changes: chrome.storage.StorageChanges) => {
        await this.init()

        changes = changes ?? {} 
        const changeId = changes["changeId"]?.newValue as string 

        if (changeId) {
            if (this.processedChangeIds.has(changeId)) {
                this.processedChangeIds.delete(changeId)
                return
            }  else {
                this.processedChangeIds.add(changeId)
            }
        }

        for (let key in changes) {
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
            if (this.testWatcher(changeKeys, changeKeySet, testers)) cb(changes)
        })
    }
    testWatcher = (changeKeys: string[], changeKeysSet: Set<string>, testers: WatcherInit[0]) => {
        if (testers.length === 0) return true 
        for (let tester of testers) {
            if (typeof tester === "function" || typeof (tester as RegExp)?.test === "function") {
                let t = ((tester as RegExp)?.test ?? tester) as RegExp["test"]
                const m = changeKeys.some(c => t(c))
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
        if (keys == null) return {...this.rawMap}
        
        let output: AnyDict = {}

        if (typeof keys === "string") {
            keys = [keys]
        } else if (Array.isArray(keys)) {

        } else if (typeof keys === "object") {
            output = {...keys} 
            keys = Object.keys(output)
        }


        for (let key of (keys as string[])) {
            if (Object.hasOwn(this.rawMap, key)) {
                output[key] = this.rawMap[key]
            }
        }

        return output 
    }
    set = async (override: AnyDict) => {
        await this.init()

        override["changeId"] = randomId()

        const changes = {} as chrome.storage.StorageChanges
        for (let key in override) {
            if (override[key] === undefined) continue 
            changes[key] = {newValue: override[key], oldValue: this.rawMap[key]} 
        }

        await Promise.all([
            this.handleChange(changes),
            chrome.storage.local.set(override)
        ])
    }
}   

gvar.es = new EntireState()

gvar.init = async () => {
    
}