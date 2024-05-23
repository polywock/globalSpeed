import { isEdge, timeout } from "./helper"

export async function queryTabsRepeat(queryInfo: chrome.tabs.QueryInfo, attempts = 5, delay = 100): Promise<chrome.tabs.Tab[]> {
  for (let i = 0; i < Math.max(0, attempts ?? 3); i++) {
    if (i) await timeout(delay ?? 100)
    try {
      return await chrome.tabs.query(queryInfo)
    } catch (err) {}
  }
}

export async function getLatestActiveTabInfo(): Promise<TabInfo> {
  let tabs = await chrome.tabs.query({active: true, lastFocusedWindow: true})
  const [ tab ] = tabs
  if (!tab) return 
  return {
    tabId: tab.id,
    windowId: tab.windowId,
    url: tab.url
  }
}

export async function getLatestActiveTabSmart(): Promise<TabInfo> {
  const tab = await getLatestActiveTabInfo()
  if (!tab) return 
  return getCorrectPane(tab)
}


export type TabInfo = {tabId: number, frameId?: number, windowId: number, url?: string}


export function compareFrame(a: TabInfo, b: TabInfo) {
  return a?.tabId === b?.tabId && (a?.frameId ?? null) === (b?.frameId ?? null)
}

export function tabToTabInfo(tab: chrome.tabs.Tab): TabInfo {
  if (!tab) return 
  return {tabId: tab.id, frameId: 0, windowId: tab.windowId}
}

export async function getCorrectPane(info: TabInfo) {
  if (!info || !isEdge()) return info 
  let key = `f:pp:${info.tabId}`
  const tabId = (await chrome.storage.local.get(key))[key]
  if (!tabId) return info  
  const lk = `f:pf:${info.tabId}`, rk = `f:pf:${tabId}`;
  const items = (await chrome.storage.local.get([lk, rk]))
  if (items[rk] > items[lk]) {
    return {...info, tabId}
  }
  return info 
}

export function senderToTabInfo(sender: chrome.runtime.MessageSender): TabInfo {
  if (!sender.tab) return 
  return {tabId: sender.tab.id, frameId: sender.frameId, windowId: sender.tab.windowId}
}

export function requestTabInfo(): Promise<TabInfo> {
  return chrome.runtime.sendMessage({type: "REQUEST_TAB_INFO"})
}

export function requestCreateTab(url: string): Promise<number> {
  return chrome.runtime.sendMessage({
    type: "REQUEST_CREATE_TAB",
    url
  })
}


export type MessageCallback = (msg: any, sender: chrome.runtime.MessageSender, reply: (msg: any) => any) => void | true 

export function getSession(keys?: any) {
  if (chrome.storage.session) return chrome.storage.session.get(keys)
  return chrome.runtime.sendMessage({type: "GET_SESSION", keys} as Messages)
}

export function setSession(override?: any) {
  if (chrome.storage.session) return chrome.storage.session.set(override)
  return chrome.runtime.sendMessage({type: "SET_SESSION", override} as Messages)
}




