import { subscribeView } from "./GlobalState"
import { StateView } from "../types"
import { isFirefox } from "../utils/helper"
import { checkURLCondition } from "../utils/configUtils"
import { getDefaultFx } from "notFirefox/defaults"


export class URLRuleManager {
  appliedRules: Map<string, Set<number>> = new Map()

  client = subscribeView({rules: true, superDisable: true}, null, true, view => {
    this.syncListeners(view)
  })
  addedCommit = false 
  addedHistory = false 
  syncListeners = (view: StateView) => {
    const enabledRules = view.superDisable ? [] :  (view.rules || []).filter(rule => rule.enabled)

    let commitFlag = false 
    let historyFlag = false 

    if (enabledRules.length) {
      commitFlag = true 

      if (enabledRules.some(rule => !rule.initialLoadOnly)) {
        historyFlag = true
      }
    }

    if (commitFlag) {
      chrome.webNavigation.onCommitted.addListener(this.handleCommit, {url: [{schemes: ["http", "https"]}]})
    } else {
      chrome.webNavigation.onCommitted.removeListener(this.handleCommit)
    }

    if (historyFlag) {
      chrome.webNavigation.onHistoryStateUpdated.addListener(this.handleHistoryUpdate, {url: [{schemes: ["http", "https"]}]})
    } else {
      chrome.webNavigation.onHistoryStateUpdated.removeListener(this.handleHistoryUpdate)
    }
  }
  hasAppliedRule = (ruleId: string, tabId: number) => {
    return !!this.appliedRules.get(ruleId)?.has(tabId)
  }
  setAppliedRule = (ruleId: string, tabId: number) => {
    const map = this.appliedRules.get(ruleId) ?? new Set()
    map.add(tabId)
    this.appliedRules.set(ruleId, map)
  }
  handleCommit = (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => {
    this.handleNavigation(details, true)
  }
  handleHistoryUpdate = (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => {
    this.handleNavigation(details, false)
  }
  handleNavigation = (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails, commit: boolean) => {
    if (details.frameId || details.tabId == null) return

    const overrides: StateView[] = []

    this.client.view?.rules?.forEach(rule => {
      if (!rule.enabled) return
      if (rule.initialLoadOnly && !commit) return 
      if (!rule.strict && this.hasAppliedRule(rule.id, details.tabId)) return 

      if (!checkURLCondition(details.url, rule.condition, false)) return 

      this.setAppliedRule(rule.id, details.tabId)

      if (rule.type === "STATE") {
        overrides.push({enabled: rule.overrideEnabled, isPinned: true})
        return 
      } 

      if (rule.type === "SPEED") {
        overrides.push({speed: rule.overrideSpeed ?? 1, isPinned: true})
        return 
      }

      if (rule.type === "FX") {
        let overrideFx = rule.overrideFx ?? {elementFx: getDefaultFx(), backdropFx: getDefaultFx()}
        
        overrides.push({...overrideFx, isPinned: true})
        return 
      }

      if (rule.type === "JS") {
        setTimeout(() => {
          rule.overrideJs && chrome.tabs.sendMessage(details.tabId, {type: "RUN_JS", value: rule.overrideJs}, {frameId: details.frameId})
        }, (isFirefox() && commit) ? 500 : 100)
        return 
      }
    }) 

    overrides.length && window.globalState.set(overrides.map(override => ({override, tabId: details.tabId})))
  }
}