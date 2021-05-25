

declare global {
  interface Window {
    bgPage?: Window 
  }
}

export function getActiveTabIds(): Promise<number[]> {
  return new Promise((res, rej) => {
    chrome.tabs.query({active: true, currentWindow: undefined}, tabs => {
      res(tabs.map(v => v.id)) 
    })
  })
}

export function getActiveTabInfo(): Promise<TabInfo> {
  return new Promise((res, rej) => {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      if (tabs[0]) {
        const [tab] = tabs
        res({
          tabId: tab.id,
          windowId: tab.windowId,
          url: tab.url
        })
      } else {
        res(null)
      }
    })
  })
}


export type TabInfo = {tabId: number, frameId?: number, windowId: number, url?: string}


export function compareFrame(a: TabInfo, b: TabInfo) {
  return a?.tabId === b?.tabId && (a?.frameId ?? null) === (b?.frameId ?? null)
}

export function senderToTabInfo(sender: chrome.runtime.MessageSender): TabInfo {
  if (!sender.tab) return 
  return {tabId: sender.tab.id, frameId: sender.frameId, windowId: sender.tab.windowId}
}

export function requestTabInfo(): Promise<TabInfo> {
  return new Promise((res, rej) => {
    chrome.runtime.sendMessage({
      type: "REQUEST_TAB_INFO"
    }, info => {
      if (chrome.runtime.lastError) {
        rej(chrome.runtime.lastError)
        return 
      } 
      res(info)
    })
  })
}

export function requestCreateTab(url: string): Promise<number> {
  return new Promise((res, rej) => {
    chrome.runtime.sendMessage({
      type: "REQUEST_CREATE_TAB",
      url
    }, id => {
      res(id)
    })
  })
}

export function hasPermissions(permission: chrome.permissions.Permissions): Promise<boolean> {
  return new Promise((res, rej) => {
    chrome.permissions.contains(permission, has => res(has))
  })
}

export function removePermissions(permission: chrome.permissions.Permissions): Promise<boolean>  {
  return new Promise((res, rej) => {
    chrome.permissions.remove(permission, has => res(has))
  })
}

export function requestPermissions(permission: chrome.permissions.Permissions): Promise<boolean> {
  return new Promise((res, rej) => {
    chrome.permissions.request(permission, has => res(has))
  })
}


export function getStorage(key?: string | object | string[]): Promise<{[key: string]: any}> {
  return new Promise((res, rej) => {
    chrome.storage.local.get(key, items => {
      if (chrome.runtime.lastError) {
        rej(chrome.runtime.lastError)
      } else {
        res(items)
      }
      return 
    })
  })
}


export type MessageCallback = (msg: any, sender: chrome.runtime.MessageSender, reply: (msg: any) => any) => void | true 

