import { AnyDict, CONTEXT_KEYS, State, URLRule } from "src/types"
import { testURL } from "src/utils/configUtils"
import { isFirefox, listToDict, pickObject, randomId } from "src/utils/helper"

type UrlRuleBehavior = [URLRule["type"][], (isOn: boolean, tabId: number, rule: URLRule, override: AnyDict, deets: Deets) => void]

type Deets = chrome.webRequest.WebRequestHeadersDetails & chrome.webNavigation.WebNavigationTransitionCallbackDetails

const RULE_BEHAVIORS: UrlRuleBehavior[] = [
    [["ON", "OFF"], (isOn, t, r, o) => {
        o[`r:${t}:enabled`] = r.type === "ON" ? true : false 
        o[`r:${t}:latestViaShortcut`] = false 
    }],
    [["SPEED"], (isOn, t, r, o) => {
        o[`r:${t}:speed`] = r.overrideSpeed ?? 1
    }],
    [["FX"], (isOn, t, r, o) => {
        o[`r:${t}:elementFx`] = r.overrideFx["elementFx"]
        o[`r:${t}:backdropFx`] = r.overrideFx["backdropFx"]
    }],
    [["JS"], async (isOn, t, r, o, d) => {
        if (!isFirefox()) return 
        let documentId = d.documentId
        if (!documentId) {
            const key = `s:ranJs:${d.tabId}`;
            const ranJs = (await gvar.es.get(key))[key]
            if (ranJs) return 
            gvar.es.set({[key]: true})
        } else {
            const k = `r:${d.documentId}:${r.id}:inserted`
            if ((await chrome.storage.local.get(k))[k]) return 
        }
        
        setTimeout(() => {
           chrome.tabs.sendMessage(d.tabId, {type: "RUN_JS", value: r.overrideJs}, {frameId: 0})
        }, 500)
    }]
]

async function handleChange(changes: chrome.storage.StorageChanges) {
    if (!(changes["g:rules"] || changes["g:superDisable"])) return 
    const raw = await gvar.es.getAllUnsafe()
    ;syncUserScripts(raw["g:rules"] || [], raw["g:superDisable"])
}

export async function syncUserScripts(rules: URLRule[], superDisable: boolean) {
    if (!chrome.userScripts) return 
    await chrome.userScripts.unregister()
    if (superDisable) return 
    rules.filter(r => r.condition).forEach(rule => {
        const parts = (rule.condition.parts ?? []).filter(p => !p.disabled && p.type !== "REGEX")
        if (!(rule.enabled && rule.type === "JS" && parts.length && rule.overrideJs?.trim())) return 
        const globs = parts.map(p => p.type === "CONTAINS" ? `*${p.valueContains}*` : `*${p.valueStartsWith}`)
        chrome.userScripts.register([
            {id: rule.id, matches: ["https://test.invalid/"], [rule.condition.block ? "excludeGlobs" : "includeGlobs"]: globs, js: [{code: rule.overrideJs}], world: "MAIN"}
        ])
    })
}

async function handleNavigation(deets: chrome.webRequest.WebRequestHeadersDetails & chrome.webNavigation.WebNavigationTransitionCallbackDetails, isCommit?: boolean) {
    if (!(!deets.frameId && deets.tabId && deets.url?.startsWith("http"))) return
    const raw = await gvar.es.getAllUnsafe()
    const rules = getEnabledRules(raw)
    if (!rules.length) return 

    if (!deets.documentId && isCommit) {
        let key = `s:ranJs:${deets.tabId}`
        if (raw[key]) {
            await gvar.es.set({[key]: null})
        }
    }

    const ruleStates = pickObject(raw, rules.map(rule => `s:ro:${deets.tabId}:${rule.id}`))

    let override = {} as AnyDict
    let fakeOverride = {} as AnyDict
    const removeKeys = new Set(CONTEXT_KEYS.map(k => `r:${deets.tabId}:${k}`)) 

    for (let rule of rules) {
        const isOnKey = `s:ro:${deets.tabId}:${rule.id}`
        const isOn = ruleStates[isOnKey] === true
        const match = testURL(deets.url, rule.condition, false)
        if (match) {
            override[isOnKey] = true 
            let o = isOn ? fakeOverride : override
            RULE_BEHAVIORS.find(([types]) => types.includes(rule.type))?.[1](isOn, deets.tabId, rule, o, deets)
        } else {
            ruleStates[isOnKey] && removeKeys.add(isOnKey)
        }
    }

    const overrideKeys = Object.keys(override)
    ;[...overrideKeys, ...Object.keys(fakeOverride)].forEach(k => removeKeys.delete(k))
    removeKeys.size && gvar.es.set(listToDict([...removeKeys], null))
    overrideKeys.length && gvar.es.set(override)
}

function getEnabledRules(raw: AnyDict) {
    if (raw["g:superDisable"]) return [] as State["rules"]
    return ((raw["g:rules"] || []) as State["rules"]).filter(rule => rule.enabled && rule.condition?.parts.some(p => !p.disabled))
}


chrome.webNavigation.onCommitted.addListener(deets => handleNavigation(deets as Deets, true))
chrome.webNavigation.onHistoryStateUpdated.addListener(deets => handleNavigation(deets as Deets))
gvar.es.addWatcher([], handleChange)


gvar.sess.cbs.add(async () => {
    const raw = await gvar.es.getAllUnsafe()
    ;syncUserScripts(raw["g:rules"] || [], raw["g:superDisable"])
})

