import { getDefaultFx } from "src/defaults"
import { AnyDict, CONTEXT_KEYS, State, URLRule, URLStrictness } from "src/types"
import { canUserScript } from "src/utils/browserUtils"
import { testURL } from "src/utils/configUtils"
import { isFirefox, isMac, isMobile, listToDict, timeout } from "src/utils/helper"

type UrlRuleBehavior = [URLRule["type"][], (isfake: boolean, tabId: number, rule: URLRule, override: AnyDict, deets: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => void]

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
        if (isFake) return 
        if (isFirefox()) {
            await timeout(500)
            chrome.tabs.sendMessage(d.tabId, {type: "RUN_JS", value: r.overrideJs}, {frameId: 0})
        } else if (canUserScript()) {
            await timeout(500)
            try {
                chrome.userScripts.execute({
                    injectImmediately: true,
                    js: [{code: r.overrideJs}],
                    world: 'MAIN',
                    target: {
                        tabId: d.tabId,
                        frameIds: [0]
                    }
                })
            } catch { }
        }
    }]
]

async function handleNavigation(deets: chrome.webNavigation.WebNavigationTransitionCallbackDetails, isCommit?: boolean) {
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

if (!(isMac() && isMobile()) && chrome.webNavigation?.onCommitted && chrome.webNavigation.onHistoryStateUpdated) {
    chrome.webNavigation.onCommitted.addListener(deets => handleNavigation(deets, true))
    chrome.webNavigation.onHistoryStateUpdated.addListener(deets => handleNavigation(deets))
}



