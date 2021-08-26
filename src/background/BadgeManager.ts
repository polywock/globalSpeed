
import { queryTabsSeveral } from "../utils/browserUtils"
import { formatSpeedForBadge } from "../utils/configUtils"
import { subscribeView, fetchView } from "./GlobalState"

export class BadgeManager {
  client = subscribeView({
    enabled: true,
    isPinned: true,
    hideBadge: true
  }, -1, true, () => {
    updateBadges()
  }, 100)
  speedClient = subscribeView({
    speed: true
  }, -1, true, () => {
    updateBadges()
  }, 1000)

  constructor() {
    chrome.tabs.onActivated.addListener(tab => {
      window.previousTabId = window.currentTabId 
      window.currentTabId = tab.tabId
      updateBadges()
    })
    // chrome.tabs.onUpdated.addListener(updateBadges)
  }
}

async function updateBadges() {
  const tabs = await queryTabsSeveral({active: true, currentWindow: undefined})

  if (!tabs?.length) return 

  const tabIds = tabs.map(tab => tab.id)
  const common = await fetchView({speed: true, enabled: true, hideBadge: true})

  let globalText = ""

  // set global badge text. 
  if (common.hideBadge || !common.enabled) {
    chrome.browserAction.setBadgeText({text: "", tabId: null})
  } else {
    chrome.browserAction.setBadgeBackgroundColor({color: "#a64646"})
    globalText = formatSpeedForBadge(common.speed)
    chrome.browserAction.setBadgeText({text: globalText, tabId: null})
  }

  // set global icon.
  chrome.browserAction.setIcon({path: common.enabled ? standardIcons : grayscaleIcons})

  // override for each active tab.
  for (let tabId of tabIds) {
    const tabView = await fetchView({speed: true, enabled: true, isPinned: true}, tabId)

    if (common.hideBadge || !tabView.enabled) {
      if (globalText !== "") {
        chrome.browserAction.setBadgeText({text: "", tabId})
      }
    } else {
      if (tabView.isPinned) {
        chrome.browserAction.setBadgeBackgroundColor({color: "#44a", tabId: tabId})
      }
      const text = formatSpeedForBadge(tabView.speed)
      if (text !== globalText) {
        chrome.browserAction.setBadgeText({text, tabId})
      }
    }
    
    if ((tabView.enabled || null) != (common.enabled || null)) {
      chrome.browserAction.setIcon({path: tabView.enabled ? standardIcons : grayscaleIcons, tabId})
    }
  }
}

export const standardIcons = {"128": `icons/128.png`}
export const grayscaleIcons = {"128": `icons/128g.png`}