import { getDefaultFx } from "src/defaults"
import { AnyDict, CONTEXT_KEYS, State, URLRule, URLStrictness } from "src/types"
import { testURL } from "src/utils/configUtils"
import { isFirefox, isMac, isMobile, listToDict, timeout } from "src/utils/helper"

type UrlRuleBehavior = [URLRule["type"][], (isfake: boolean, tabId: number, rule: URLRule, override: AnyDict, deets: Deets) => void]

type Deets = chrome.webRequest.WebRequestHeadersDetails & chrome.webNavigation.WebNavigationTransitionCallbackDetails

const RULE_BEHAVIORS: UrlRuleBehavior[] = [
    [["ON", "OFF"], (isFake, t, r, o) => {
        o[`r:${t}:enabled`] = r.type === "ON" ? true : false 
        o[`r:${t}:latestViaShortcut`] = false 
    }],
    [["SPEED"], (isFake, t, r, o) => {
        o[`r:${t}:speed`] = r.overrideSpeed ?? 1
    }],
    [["FX"], (isFake, t, r, o) => {
        o[`r:${t}:elementFx`] = r.overrideFx?.["elementFx"] || getDefaultFx()
        o[`r:${t}:backdropFx`] = r.overrideFx?.["backdropFx"] || getDefaultFx()
    }],
    [["JS"], async (isFake, t, r, o, d) => {
        if (!isFirefox() || isFake) return 
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
    if (isMobile()) return 
    try {
        await chrome.userScripts.unregister()
    } catch { return }
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

    let override = {} as AnyDict
    let fakeOverride = {} as AnyDict
    const removeKeys = new Set(CONTEXT_KEYS.map(k => `r:${deets.tabId}:${k}`)) 
    let pageTitle: string = undefined  

    for (let rule of rules) {
        const isOnKey = `s:ro:${deets.tabId}:${rule.id}`
        const oldHost = raw[isOnKey] as string 

        let match = testURL(deets.url, rule.condition, false)
        if (match && rule.titleRestrict && !deets.frameId) {
            if (pageTitle === undefined) {
                await timeout(2500)
                const tabInfo = await chrome.tabs.get(deets.tabId)
                pageTitle = tabInfo.title || null 
            }
            if (!(pageTitle && matchesPageTitle(pageTitle.toLowerCase(), rule.titleRestrict))) {
                match = false 
            }
        }
        if (match) {
            override[isOnKey] = (new URL(deets.url)).hostname
            let apply = oldHost ? shouldReApply(rule.type === "JS" ? URLStrictness.EVERY_COMMIT : (rule.strictness || URLStrictness.DIFFERENT_HOST), oldHost, override[isOnKey], isCommit) : true 
            let o = apply ? override : fakeOverride
            RULE_BEHAVIORS.find(([types]) => types.includes(rule.type))?.[1](o === fakeOverride, deets.tabId, rule, o, deets)
        } else {
            raw[isOnKey] && removeKeys.add(isOnKey)
        }
    }

    const overrideKeys = Object.keys(override)
    ;[...overrideKeys, ...Object.keys(fakeOverride)].forEach(k => removeKeys.delete(k))
    removeKeys.size && gvar.es.set(listToDict([...removeKeys], null))
    overrideKeys.length && gvar.es.set(override)
}

function matchesPageTitle(pageTitle: string, condition: string) {
    if (!condition) return true  
    const tags = condition.toLowerCase().split(/,+\s+/)
    return tags.some(tag => pageTitle.includes(tag))
}

function getEnabledRules(raw: AnyDict) {
    if (raw["g:superDisable"]) return [] as State["rules"]
    return ((raw["g:rules"] || []) as State["rules"]).filter(rule => rule.enabled && rule.condition?.parts.some(p => !p.disabled))
}

function shouldReApply(strictness: URLStrictness, oldHost: string, currentHost: string, isCommit: boolean) {
    if (strictness === URLStrictness.DIFFERENT_HOST) {
        return isCommit && currentHost !== oldHost
    } else if (strictness === URLStrictness.EVERY_COMMIT) {
        return isCommit
    } else if (strictness === URLStrictness.EVERY_NAVIGATION) {
        return true 
    } 
    return false 
}

if (!(isMac() && isMobile())) {
    chrome.webNavigation.onCommitted.addListener(deets => handleNavigation(deets as Deets, true))
    chrome.webNavigation.onHistoryStateUpdated.addListener(deets => handleNavigation(deets as Deets))
    gvar.es.addWatcher([], handleChange)
    
    
    gvar.sess.safeCbs.add(async () => {
        const raw = await gvar.es.getAllUnsafe()
        ;syncUserScripts(raw["g:rules"] || [], raw["g:superDisable"])
    })
}



