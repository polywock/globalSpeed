import "./utils/session"
import "./utils/state"
import "./badge"
import "./rules"
import "./capture"

import { AnyDict, CONTEXT_KEYS, Context, InitialContext, Keybind, KeybindMatch, KeybindMatchId, State, Trigger, URLRule} from "src/types"
import { PREFIX_SETS, dumpConfig, fetchView, getKeysByPrefix, pushView, restoreConfig } from "src/utils/state"
import { migrateSchema } from "src/background/utils/migrateSchema"
import { getDefaultContext, getDefaultState } from "src/defaults"
import { isFirefox } from "src/utils/helper"
import { getCorrectPane, getLatestActiveTabInfo, tabToTabInfo } from "src/utils/browserUtils"
import { ProcessKeybinds, setValue, type SetValueInit } from "./utils/processKeybinds"
import { findMatchingKeybindsContext, findMatchingKeybindsGlobal, testURL } from "src/utils/configUtils"
import { loadGsm } from "src/utils/gsm"
import { clearClosed } from "./utils/getAutoMedia"
import { syncContextMenu, syncContextMenuDeb } from "src/utils/contextMenus"
import { MediaEvent } from "src/contentScript/isolated/utils/applyMediaEvent"


declare global {
    interface GlobalVar {
      installPromise: Promise<any> 
    }
}


;(globalThis as any).gvar = gvar 

async function onInstallAsync() {
    let stateView: State 
    try {        
        let config = await dumpConfig()
        if (!config.version) {
            config = (await chrome.storage.local.get("config")).config
        } 
        stateView = migrateSchema(config)
    } catch (err) {
        console.log("ERROR", err)
    }

    stateView = stateView || getDefaultState()

    await restoreConfig(stateView)
    delete gvar.installPromise
}

gvar.sess.installCbs.add(() => {
    chrome.storage.session.setAccessLevel?.({accessLevel: chrome.storage.AccessLevel.TRUSTED_AND_UNTRUSTED_CONTEXTS})
    gvar.installPromise = onInstallAsync()
    isFirefox() || ensureContentScripts()
})

gvar.sess.cbs.add(async () => {
    if (gvar.installPromise) await gvar.installPromise

    const items = await chrome.storage.local.get()
    let keys = Object.keys(items).filter(k => items[k] == null)

    keys = [...keys, ...(await getKeysByPrefix(PREFIX_SETS.SESSION, items))]
    if (keys.length) await chrome.storage.local.remove(keys)
})

async function ensureContentScripts() {
    const tabs = await chrome.tabs.query({url: ["https://*/*", "http://*/*"]})
    if (!tabs) return 
    for (let tab of tabs) {
        if (!tab.url) continue
        try {
            await chrome.scripting.executeScript({target: {tabId: tab.id, allFrames: true}, files: ["isolated.js"]})
        } catch (err) { }
    }
}


chrome.tabs.onRemoved.addListener(async tab => {
    const rules = ((await fetchView(["rules"])).rules || []) as URLRule[]

    chrome.storage.local.remove([
        ...[...CONTEXT_KEYS, "isPinned"].map(k => `t:${tab}:${k}`),
        ...CONTEXT_KEYS.map(k => `r:${tab}:${k}`),
        `s:ranJs:${tab}`,
        ...rules.map(r => `s:ro:${tab}:${r.id}`),
        `s:pf:${tab}`,
        `s:pp:${tab}`
    ])

    if (Math.random() > 0.95) clearClosed()
})

chrome.tabs.onCreated.addListener(async tab => {
    const view = await fetchView({pinByDefault: true, initialContext: true, customContext: true}) 
    if (!view.pinByDefault) return 
    let openerId = tab.openerTabId
    let mode = view.initialContext ?? InitialContext.PREVIOUS
    
    let newContext = getDefaultContext(true)
    if (mode === InitialContext.NEW) {
        // nothing 
    }   else if (mode === InitialContext.CUSTOM) {
        newContext = view.customContext ?? newContext
    }   else {
        newContext = (await fetchView(CONTEXT_KEYS, (mode === InitialContext.PREVIOUS) ? (openerId ?? 0) : 0)) as Context
    }

    pushView({override: {...newContext, isPinned: true}, tabId: tab.id})
})

isFirefox() || chrome.commands.onCommand.addListener(
    async (command: string, tab: chrome.tabs.Tab) => {
      const isGlobal = !tab
      const view = await fetchView({enabled: true, superDisable: true, keybinds: true, keybindsUrlCondition: true, latestViaShortcut: true})
      if (view.superDisable) return 

      let keybinds: Keybind[] = view.keybinds || []
      if (!view.enabled) {
        keybinds = keybinds.filter(kb => kb.command === "state" && kb.enabled && (kb.trigger || Trigger.LOCAL) === Trigger.LOCAL && (view.latestViaShortcut || kb.alwaysOn))
        if (!keybinds.length) return 
      }

      let matches = findMatchingKeybindsGlobal(keybinds, command)
    
      if (!matches.length) return 
      // Latest is fine? Play around later.
      let tabInfo = tab ? tabToTabInfo(tab) : (await getLatestActiveTabInfo())
      tabInfo = await getCorrectPane(tabInfo)
    
    
      const url = tabInfo?.url || ""
    
      if (view.keybindsUrlCondition && !testURL(url, view.keybindsUrlCondition, true)) {
        return 
      }
    
    
      matches = matches.filter(match => {
        if (match.kb.condition?.parts.length > 0) {
          return testURL(url, match.kb.condition, true)
        } 
        return true 
      })
    
      new ProcessKeybinds(matches, tabInfo)
    }
)

chrome.contextMenus.onClicked.addListener(async (item, tab) => {
    const keybinds = (await fetchView({keybinds: true})).keybinds
    const matches = findMatchingKeybindsContext(keybinds, item.menuItemId as string)
    if (matches.length !== 1) return 
    new ProcessKeybinds([matches[0]], tabToTabInfo(tab))
})

declare global {
    interface Message {
        requestTabInfo: { type: "REQUEST_TAB_INFO" }
        requestGsm: { type: "REQUEST_GSM" }
        requestCreateTab: { type: "REQUEST_CREATE_TAB", url: string}
        triggerKeybinds: { type: "TRIGGER_KEYBINDS", ids: KeybindMatchId[]}
        edgePing: { type: "EDGE_PING" }
        requestPane: { type: "REQUEST_PANE"}
        setSession: { type: "SET_SESSION", override: AnyDict}
        getSession: { type: "GET_SESSION", keys: any}
        setLocal: { type: "SET_LOCAL", override: AnyDict}
        getLocal: { type: "GET_LOCAL", keys: any}
        insertCss: { type: "INSERT_CSS", value: string }
        syncContextMenus: { type: "SYNC_CONTEXT_MENUS", direct?: boolean }
        sendMediaEventTo: {type: "SEND_MEDIA_EVENT_TO", tabId: number, frameId?: number, event: MediaEvent, key: string},
        setValue: {type: 'SET_STATEFUL', init: SetValueInit}
    }
}

chrome.runtime.onMessage.addListener((msg: Messages, sender, reply) => {

    if (msg.type === "REQUEST_TAB_INFO") {
        reply({
            tabId: sender.tab.id,
            frameId: sender.frameId
        })
    } else if (msg.type === "REQUEST_GSM") {
        loadGsm().then(gsm => reply(gsm), err => reply(null))
        return true 
    } else if (msg.type === "REQUEST_CREATE_TAB") {
        chrome.tabs.create({
            url: msg.url
        })
        reply(true)
    } else if (msg.type === "REQUEST_PANE") {
        chrome.scripting.executeScript({target: {tabId: sender.tab.id}, files: ["pane.js"], injectImmediately: true}).finally(() => reply(true))
        return true 
    } else if (msg.type === "TRIGGER_KEYBINDS") {
        fetchView({keybinds: true}).then(({keybinds}) => {
            let matches = msg.ids.map(v => {
                let kb = keybinds.find(kb => kb.id === v.id)
                if (!kb) return null 
                return {
                    kb,
                    alt: v.alt
                } as KeybindMatch
            })
            new ProcessKeybinds(matches, {tabId: sender.tab.id, frameId: sender.frameId, windowId: sender.tab.windowId})
        })
        reply(true)
    } else if (msg.type === "EDGE_PING") {
        if (sender.tab?.index !== -1) return 
        chrome.tabs.get(sender.tab.id, info => {
        if (!info || !(info.index > 0)) return 
        chrome.tabs.query({windowId: sender.tab.windowId, index: info.index}, tabs => {
            if (tabs.length !== 1 && tabs[0].id !== info.id) return 
            // this tab is left pane. 
            const leftTabId = tabs[0].id
            chrome.storage.local.set({
            [`s:pp:${leftTabId}`]: info.id
            })
            chrome.tabs.sendMessage(leftTabId, {type: "TRACK_FOCUS", tabKey: `s:pf:${leftTabId}`, otherTabKey: `s:pf:${info.id}`})
            chrome.tabs.sendMessage(info.id, {type: "TRACK_FOCUS", tabKey: `s:pf:${info.id}`, otherTabKey: `s:pf:${leftTabId}`})
        })
        })
        reply(true)
    } else if (msg.type === "SET_SESSION") {
        chrome.storage.session.set(msg.override)
    } else if (msg.type === "GET_SESSION") {
        (chrome.storage.session.get(msg.keys) as any).then((v: any) => reply(v), (err: any) => reply(null))
        return true 
    } else if (msg.type === "SET_LOCAL") {
       gvar.es.set(msg.override)
    } else if (msg.type === "GET_LOCAL") {
        (gvar.es.get(msg.keys) as any).then((v: any) => reply(v), (err: any) => reply(null))
        return true 
    } else if (msg.type === "INSERT_CSS") {
        chrome.scripting.insertCSS({
            css: msg.value,
            target: {
                tabId: sender.tab.id,
                frameIds: [sender.frameId]
            }
        })
    } else if (msg.type === "SYNC_CONTEXT_MENUS") {
        msg.direct ? syncContextMenu() : syncContextMenuDeb()
    } else if (msg.type === "SEND_MEDIA_EVENT_TO") {
        reply(true)
        chrome.tabs.sendMessage(msg.tabId, {type: "APPLY_MEDIA_EVENT", event: msg.event, key: msg.key}, {frameId: msg.frameId || 0})
    } else if (msg.type === "SET_STATEFUL") {
        reply(true)
        setValue(msg.init)
    }
})

const speedRelevantKeys = ['g:speed', 'g:freePitch', 'g:enabled', 'g:superDisable']

gvar.es.addWatcher([], async changes => {
    if (!speedRelevantKeys.some(k => changes[k])) return

    const raw = await gvar.es.getAllUnsafe()
    let value = {speed: raw['g:speed'] as number, freePitch: raw['g:freePitch'] as boolean}
    if (raw['g:superDisable'] || !raw['g:enabled']) value = null 
    let tabs = await chrome.tabs.query({audible: true, active: false})

    tabs.forEach(tab => {
        if (raw[`t:${tab.id}:isPinned`] || raw[`r:${tab.id}:speed`]) return 
        chrome.tabs.sendMessage(tab.id, {type: "BG_SPEED_OVERRIDE", value} as Messages)
    })
})