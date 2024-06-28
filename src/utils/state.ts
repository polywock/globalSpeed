import type { DebouncedFunc } from "lodash";
import debounce from "lodash.debounce";
import { CONTEXT_KEYS, ORL_CONTEXT_KEYS_SET, CONTEXT_KEYS_SET, Context, State, StateView, StateViewSelector, StoredKey, AnyDict, ORL_CONTEXT_KEYS, ORL_GROUPS, REVERSE_ORL_GROUP } from "src/types"
import { deepEqual, listToDict, randomId } from "src/utils/helper"
import { syncContextMenu } from "./contextMenus";

export function getAllRelevantStorageKeys(selector: StateViewSelector, tabId: number, ignoreRuleOverrides = false, includeIsPinned = false) {
    let storedKeys: Set<StoredKey> = new Set() 

    // Useful with SubscribeView's precog. 
    includeIsPinned && tabId > 0 && storedKeys.add(`t:${tabId}:isPinned`) 
    
    for (let key in selector) {
        if (key === "isPinned") {
            tabId > 0 && storedKeys.add(`t:${tabId}:isPinned`) 
        } else if (key === "hasOrl") {
            tabId > 0 && ORL_CONTEXT_KEYS.forEach(k => {
                storedKeys.add(`r:${tabId}:${k as keyof Context}`)
            })
        } else if (CONTEXT_KEYS_SET.has(key as keyof Context)) { 
            storedKeys.add(`g:${key as keyof State}`) 
            if (tabId > 0) {
                storedKeys.add(`t:${tabId}:${key as keyof Context}`) 
                storedKeys.add(`t:${tabId}:isPinned`)
                !ignoreRuleOverrides && ORL_CONTEXT_KEYS_SET.has(key as keyof Context) && storedKeys.add(`r:${tabId}:${key as keyof Context}`)
            }
        } else {
            storedKeys.add(`g:${key as keyof State}`)
        }
    }
    return [...storedKeys]
}

function extractViewFromRelevantRawMap(selector: StateViewSelector, raw: AnyDict, tabId: number) {
    raw = {...raw}
    let incipit = 'g:'
    
    if (tabId > 0 && raw[`t:${tabId}:isPinned`] ) {
        incipit = `t:${tabId}:`
    }

    const exclaimIncipit = `r:${tabId}:`

    let view: AnyDict = {} 
    for (let key in selector) {
        if (key === "isPinned") {
            view[key] = raw[incipit.concat(key)] 
        } else if (key === "hasOrl") {
            view[key] = ORL_CONTEXT_KEYS.some(o => (
                raw[exclaimIncipit.concat(o)] != null 
            ))
        } else if (CONTEXT_KEYS_SET.has(key as keyof Context)) {
            view[key] = raw[exclaimIncipit.concat(key)] ?? raw[incipit.concat(key)] 
        } else {
            view[key] = raw[`g:${key}`]
        }
    }
    return view 
}

// ignoreExclaim used to get pure context for pushHandleAddPin
export async function fetchView(selector: StateViewSelector | (keyof StateView)[], tabId?: number, ignoreExclaim = false): Promise<StateView> {
    tabId = tabId ?? 0
    selector = Array.isArray(selector) ? listToDict(selector, true) : selector
    const storage = await localGetAuto(getAllRelevantStorageKeys(selector, tabId, ignoreExclaim))
    return extractViewFromRelevantRawMap(selector, storage, tabId)
}

export type PushViewInit = {
    override: StateView, 
    overrideRaw?: AnyDict,
    tabId?: number, 
    inheritContextFromTabId?: number,
    overDefault?: boolean,
    knownPinStatus?: boolean
}

export async function pushView(init: PushViewInit) {
    const base = await pushViewGhost(init)
    return localSetAuto(base)
}

export async function pushViewGhost(init: PushViewInit) {
    init.tabId = init.tabId ?? 0
    init.override = {...init.override}
    const globalMap = {} as AnyDict

    let contextEntries = Object.entries(init.override).filter(([k, v]) => {
        if (k === "isPinned") return 

        if (CONTEXT_KEYS_SET.has(k as keyof Context)) {
            return true 
        } else if (k === "hasOrl") {
            if (v == true || init.tabId === 0) return  
            ORL_CONTEXT_KEYS.forEach(o => {
                globalMap[`r:${init.tabId}:${o}`] = null 
            })
        } else {
            globalMap[`g:${k}`] = v
        }
    })

    let involvesContext = contextEntries.length || init.override.isPinned != null 

    let {base, isPinned} = involvesContext ? (await pushHandleIsPinned({}, init)) : {base: {}, isPinned: false}
    Object.assign(base, globalMap)
    
    if (contextEntries.length) {
        const incipit = isPinned ? `t:${init.tabId}:` : 'g:'
        const exclaimIncipit = `r:${init.tabId}:`

        
        contextEntries.forEach(([k, v]) => {
            base[`${incipit}${k}`] = v 
            
            // E.g. All tightly coupled properties should clear together. 
            if (ORL_CONTEXT_KEYS_SET.has(k as keyof Context)) {
                REVERSE_ORL_GROUP[k as keyof Context].forEach(b => {
                    base[`${exclaimIncipit}${b}`] = null 
                })
            }
        })
    }

    if (init.overrideRaw) {
        for (let key in init.overrideRaw) {
            base[key] = init.overrideRaw[key]
        }
    }


    return base 
}

/** Handle any isPinned override and get latest isPinned */
async function pushHandleIsPinned(base: AnyDict, init: PushViewInit) {
    const o = init.override
    if (o.isPinned != null && init.tabId === 0) throw Error("Setting isPinned requires a non-zero tabId")

    let isPinned = false 
    if (init.tabId > 0) {
        isPinned = init.knownPinStatus ?? (await fetchView(["isPinned"], init.tabId))["isPinned"] ?? false 

        if (o.isPinned != null) {
            if (o.isPinned === true && isPinned === false) {
                base = await pushHandleAddPin(base, init.tabId, init.inheritContextFromTabId || 0)
                isPinned = true 
            } else if (o.isPinned === false && isPinned === true) {
                base = pushHandleClearPin(base, init.tabId)
                isPinned = false 
            }
        }
    }
    delete o.isPinned

    return {base, isPinned}
}

function pushHandleClearPin(base: AnyDict, tabId: number) {
    [...CONTEXT_KEYS, "isPinned"].forEach(k => {
        base[`t:${tabId}:${k}`] = null 
    })
    ORL_CONTEXT_KEYS.forEach(k => {
        base[`r:${tabId}:${k}`] = null 
    })
    return base 
}

async function pushHandleAddPin(base: AnyDict, tabId: number, inheritTabId: number) {
    CONTEXT_KEYS.forEach(k => {
        base[`t:${tabId}:${k}`] = null 
    })
    base[`t:${tabId}:isPinned`] = true 

    const inherit = (await fetchView(CONTEXT_KEYS, inheritTabId, true))
    for (let key in inherit) {
        base[`t:${tabId}:${key}`] = inherit[key as keyof Context]
    }
    ORL_CONTEXT_KEYS.forEach(k => {
        base[`r:${tabId}:${k}`] = null 
    })
    
    return base 
}

type SubViewCallback = (view: StateView, forOnLaunch?: boolean) => void

export class SubscribeView {
    selector: StateViewSelector
    cbs: Set<SubViewCallback> = new Set()
    private rawMap?: AnyDict
    private latestView?: StateView
    processedChangeIds: Set<string> = new Set() 
    view?: StateView
    watchKeys: Set<string>
    released = false 

    constructor(_selector: StateViewSelector | string[], private tabId?: number, private onLaunch?: boolean, cb?: SubViewCallback, public wait?: number, public maxWait?: number) {
        this.triggerCbs = this.wait ? (
            debounce(this._triggerCbs, this.wait, {trailing: true, leading: true, ...(this.maxWait == null ? {} : {maxWait: this.maxWait})})
        ) : this._triggerCbs

        this.tabId = tabId ?? 0
        this.selector = Array.isArray(_selector) ? listToDict(_selector, true) : _selector
        cb && this.cbs.add(cb)
        this.watchKeys = new Set(getAllRelevantStorageKeys(this.selector, this.tabId, undefined, true))
        this.start()
    }
    start = async () => {
        chrome.storage.local.onChanged.addListener(this.handleChange)
        if (this.onLaunch) {
            await this.handleChange(null, true)
        }
    }
    release = () => {
        if (this.released) return 
        this.released = true 
        ;(this.triggerCbs as any).cancel?.()
        delete this.triggerCbs
        try { chrome.storage.local.onChanged.removeListener(this.handleChange) } catch (err) { }
        this.cbs.clear()
        this.processedChangeIds.clear()
        delete this.cbs, delete this.tabId, delete this.selector, delete this.processedChangeIds
        delete this.view, delete this.latestView, delete this.rawMap
    }
    handleChange = async (changes: chrome.storage.StorageChanges, forOnLaunch = false) => {
        if (this.released) return 
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

        let hadChanges = forOnLaunch 
        let instantTrigger = this.tabId && changes[`t:${this.tabId}:isPinned`]
        if (!this.rawMap) {
            this.rawMap = await chrome.storage.local.get([...this.watchKeys])
            hadChanges = true 
        }
        for (let key in changes) {
            if (!this.watchKeys.has(key)) continue 
            this.rawMap[key] = changes[key].newValue
            hadChanges = true 
        }

        if (!hadChanges) return 
        

        const newView = extractViewFromRelevantRawMap(this.selector, this.rawMap, this.tabId)
        if (deepEqual(this.latestView, newView)) {
            return 
        }
        this.latestView = newView
        this.view = structuredClone(this.latestView)
        if (instantTrigger) {
            (this.triggerCbs as any).cancel?.()
            this._triggerCbs(forOnLaunch)
        } else {
            this.triggerCbs(forOnLaunch)
        }
    }
    _triggerCbs = (forOnLaunch = false) => {
        this.cbs.forEach(cb => cb(this.view, forOnLaunch))
    }
    triggerCbs: typeof this._triggerCbs | DebouncedFunc<typeof this._triggerCbs>

    push = async (override: StateView, tryPreCog = true) => {
        if (!tryPreCog) return pushView({override, tabId: this.tabId})
        
        let knownPinStatus = undefined
        
        if (this.rawMap) {
            if (this.tabId > 0) {
                knownPinStatus = !!this.rawMap[`t:${this.tabId}:isPinned`]
            } else {
                knownPinStatus = false 
            }
        }

        if (knownPinStatus != null) {
            return this.pushPreCog(override, knownPinStatus)
        } 
        return pushView({override, tabId: this.tabId})
    }
    pushPreCog = async (override: StateView, knownPinStatus: boolean) => {
        const base = await pushViewGhost({override, tabId: this.tabId, knownPinStatus, overrideRaw: {
            changeId: randomId()
        }})
        const changes = {} as chrome.storage.StorageChanges
        for (let key in base) {
            if (base[key] === undefined) continue 
            changes[key] = {newValue: base[key]} 
        }

        return Promise.all([
            this.handleChange(changes, true),
            chrome.storage.local.set(base)
        ])
    }
}   

type SubStorageCallback = (view: AnyDict, forOnLaunch?: boolean) => void

export class SubscribeStorageKeys {
    keys: Set<string>
    cbs: Set<SubStorageCallback> = new Set()
    private rawMap?: AnyDict
    latestRaw?: AnyDict
    released = false 

    constructor(_keys: string[], private onLaunch?: boolean, cb?: SubStorageCallback, public wait?: number, public maxWait?: number) {
        this.triggerCbs = this.wait ? (
            debounce(this._triggerCbs, this.wait ?? 0, {trailing: true, leading: true, ...(this.maxWait == null ? {} : {maxWait: this.maxWait})})
        ) : this._triggerCbs

        this.keys = new Set(_keys)
        cb && this.cbs.add(cb)
        this.start()
    }
    start = async () => {
        chrome.storage.local.onChanged.addListener(this.handleChange)
        if (this.onLaunch) {
            await this.handleChange(null)
        }
    }
    release = () => {
        if (this.released) return 
        this.released = true 
        ;(this.triggerCbs as any).cancel?.()
        delete this.triggerCbs
        chrome.storage.local.onChanged.removeListener(this.handleChange)
        this.cbs.clear()
        delete this.cbs, delete this.rawMap, 
        delete this.latestRaw, delete this.keys, delete this.rawMap
    }
    handleChange = async (changes: chrome.storage.StorageChanges) => {
        changes = changes ?? {} 
        let hadChanges = false 
        if (!this.rawMap) {
            this.rawMap = await chrome.storage.local.get([...this.keys])
            hadChanges = true 
        }
        for (let key in changes) {
            if (!this.keys.has(key)) continue 
            this.rawMap[key] = changes[key].newValue
            hadChanges = true 
        }
        if (!hadChanges) return 

        this.latestRaw = structuredClone(this.rawMap)
        this.triggerCbs()
    }
    _triggerCbs = () => {
        this.cbs.forEach(cb => cb(this.latestRaw))
    }
    triggerCbs: typeof this._triggerCbs | DebouncedFunc<typeof this._triggerCbs>
    
    push = (override: AnyDict) => {
        chrome.storage.local.set(override)
    }
}

export async function dumpConfig() {
    const entries = Object.entries(await chrome.storage.local.get())
    const global = Object.fromEntries(entries.filter(([k]) => k.startsWith("g:")).map(([k, v]) => [k.slice(2), v]))
    return {...global} as State 
}

export async function restoreConfig(config: State, clearBase = true) {
    // Base clear all session and global values.
    const newItems = clearBase ? Object.fromEntries((await getKeysByPrefix(PREFIX_SETS.G)).map(v => [v, null])) : {}

    for (let key in config) {
        newItems[`g:${key}`] = config[key as keyof State]
    } 
    setTimeout(() => {
        syncContextMenu(config.keybinds)
    }, 100)
    return chrome.storage.local.set(newItems)
}

export const PREFIX_SETS = {
    SESSION: ['s:', 'r:', 't:'],
    SESSION_AND_G: ['s:', 'r:', 't:', 'g:'],
    G: ['g:']
}

export async function getKeysByPrefix(prefixes: string[], items?: AnyDict) {
    items = items ?? (await chrome.storage.local.get())
    return Object.keys(items).filter(v => prefixes.some(prefix => v.startsWith(prefix)))
}


function pruneObjectNull(object: any) {
    for (let key in object) {
        if (object[key] == null) {
            delete object[key]
        }
    }
}


export async function localGetAuto(keys?: string | string[] | AnyDict): Promise<AnyDict> {
    return gvar.es ? gvar.es.get(keys) :  chrome.storage.local.get(keys)
}

export async function localSetAuto(override: AnyDict): Promise<void> {
    return gvar.es ? gvar.es.set(override) :  chrome.storage.local.set(override)
}


const TR_REGEX = /(?:t|r|c):\d+\:/

function extractKey(storedKey: string) {
    if (storedKey.startsWith("g:")) return storedKey.slice(2)
    if (["t", "r", "c"].some(scheme => storedKey.startsWith(scheme))) {
        const match = TR_REGEX.exec(storedKey)
        if (!match) return 
        return storedKey.slice(match[0].length)
    } 
    return storedKey
}