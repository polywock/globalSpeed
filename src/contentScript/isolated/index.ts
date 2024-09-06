
import type { TabInfo } from '../../utils/browserUtils'
import { Overseer } from './Overseer'


declare global {
  interface GlobalVar {
    tabInfo: TabInfo,
    os: Overseer,
    fallbackId: number,
    ghostMode?: boolean,
    isTopFrame?: boolean
  }
}

async function main() {
  if ((globalThis as any).gvar) return 
  ;(globalThis as any).gvar = gvar 
  ;(document as any).gvar = gvar 
  gvar.isTopFrame = window.self === window.top
  gvar.os = new Overseer()
  gvar.os.init()
  selfPromotionHelper()
}


main()

// Used to self-promote another extension I made. 
function selfPromotionHelper() {
  if (location.hostname !== "chatgpt.com") return 
  const key = "g:gptWebsiteCounter"
  chrome.storage.local.get({[key]: 0}, items => {
    if (items[key] === -1) return 
    chrome.storage.local.set({[key]: Math.min(items[key] + 1, 5)})
  })
}