import { formatSpeedForBadge } from "src/utils/configUtils"
import { fetchView } from "src/utils/state"
import debounce from "lodash.debounce"
import { isMobile } from "src/utils/helper"

type BadgeInit = Awaited<ReturnType<typeof getBadgeInit>>

let commonInit: BadgeInit

const standardIcons = {"128": `icons/128.png`}
const grayscaleIcons = {"128": `icons/128g.png`}

async function updateVisible(tabs?: chrome.tabs.Tab[]) {
    if (!commonInit) {
        commonInit = await getBadgeInit(0)
    }
    writeBadge(commonInit, undefined)
    updateTabs(tabs ?? (await chrome.tabs.query({active: true})))
}

const updateVisibleDeb = debounce(updateVisible, 100, {leading: true, trailing: true, maxWait: 1000})


async function updateTabs(tabs: chrome.tabs.Tab[]) {
    return Promise.all(tabs.map(tab => updateTab(tab)))
}

async function updateTab(tab: chrome.tabs.Tab) {
    const init = await getBadgeInit(tab.id)
    writeBadge(init, tab.id)
}


async function getBadgeInit(tabId: number) {
    const { isPinned, speed, enabled, hasOrl, superDisable, hideBadge } = await fetchView({hideBadge: true, superDisable: true, isPinned: true, speed: true, enabled: true, hasOrl: true}, tabId)
    
    const isEnabled = enabled && !superDisable
    let showBadge = isEnabled && !hideBadge
    
    let badgeIcons = isEnabled ? standardIcons : grayscaleIcons
    let badgeText = showBadge ? formatSpeedForBadge(speed ?? 1) : ""
    let badgeColor = "#000"

    if (hasOrl && !isEnabled && !hideBadge) {
        showBadge = true 
        badgeText = "OFF"
    }

    if (showBadge) {
        badgeColor = hasOrl ? "#7fffd4" :  (isPinned ? "#44a" : "#a33") 
    }
    return {badgeText, badgeColor, badgeIcons}
}

async function writeBadge(init: BadgeInit, tabId?: number) {
    chrome.action.setBadgeText({text: init.badgeText, tabId})
    chrome.action.setBadgeBackgroundColor({color: init.badgeColor, tabId})
    chrome.action.setIcon({path: init.badgeIcons, tabId})
}

const WATCHERS = [
    /^g:(speed|enabled|superDisable|hideBadge)/,
    /^[rt]:[\d\w]+:(speed|isPinned|enabled)/,
    /^[r]:[\d\w]+:(elementFx|backdropFx|latestViaShortcut|)/
]

if (!isMobile()) {
    gvar.es.addWatcher(WATCHERS, changes => {
        updateVisibleDeb()
    })
    gvar.sess.safeCbs.add(() => updateVisible())
    chrome.webNavigation.onCommitted.addListener(() => updateVisible())
    chrome.tabs.onActivated.addListener(() => updateVisible())
}