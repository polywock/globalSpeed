
import debounce from "lodash.debounce"
import { isFirefox } from "src/utils/helper"
import { queryTabsSeveral } from "../utils/browserUtils"
import { formatSpeedForBadge } from "../utils/configUtils"
import { subscribeView, fetchView } from "./GlobalState"

export class BadgeManager {
  client = subscribeView({
    enabled: true,
    isPinned: true,
    hideBadge: true
  }, -1, true, () => {
    this.updateBadgesDeb()
  }, 100)
  speedClient = subscribeView({
    speed: true
  }, -1, true, () => {
    this.updateBadgesDeb()
  }, 1000)

  constructor() {
    chrome.tabs.onActivated.addListener(tab => {
      window.previousTabId = window.currentTabId 
      window.currentTabId = tab.tabId
      this.updateBadgesDeb()
    })
    isFirefox() && chrome.tabs.onUpdated.addListener(this.updateBadgesDeb)
  }
  updateBadgesDeb = debounce(updateBadges, 500, {trailing: true, leading: true})
}


async function updateBadges() {
  const tabs = await queryTabsSeveral({active: true, currentWindow: undefined})
  if (!tabs?.length) return 

  const tabIds = tabs.map(tab => tab.id)
  const common = await fetchView({speed: true, enabled: true, hideBadge: true})

  // set global badge text. 
  if (common.hideBadge || !common.enabled) {
    chrome.browserAction.setBadgeText({text: "", tabId: null})
  } else {
    chrome.browserAction.setBadgeBackgroundColor({color: "#a64646"})
    chrome.browserAction.setBadgeText({text: formatSpeedForBadge(common.speed), tabId: null})
  }

  // set global icon.
  chrome.browserAction.setIcon({path: common.enabled ? standardIcons : grayscaleIcons})

  // override for each active tab.
  for (let tabId of tabIds) {
    const tabView = await fetchView({speed: true, enabled: true, isPinned: true}, tabId)

    if (common.hideBadge || !tabView.enabled) {
      chrome.browserAction.setBadgeText({text: "", tabId})
    } else {
      chrome.browserAction.setBadgeBackgroundColor({color: tabView.isPinned ? "#44a" : "#a64646", tabId: tabId})
      chrome.browserAction.setBadgeText({text: formatSpeedForBadge(tabView.speed), tabId})
    }
    
    chrome.browserAction.setIcon({path: tabView.enabled ? standardIcons : grayscaleIcons, tabId})
  }
}

export const standardIcons = {"128": `icons/128.png`}
export const grayscaleIcons = {"128": `icons/128g.png`}