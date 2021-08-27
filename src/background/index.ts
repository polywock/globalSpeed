import { migrateSchema } from "../utils/migrateSchema"
import { BadgeManager } from './BadgeManager'
import { PortCapture } from './PortCapture'
import { getStorage, getActiveTabInfo, queryTabsSeveral } from '../utils/browserUtils'
import { getDefaultState } from '../defaults'
import { State } from '../types'
import { GsmManager } from "./GsmManager"
import { GlobalState } from "./GlobalState"
import { processKeybinds } from "./processKeybinds"
import { GlobalMedia } from "./GlobalMedia"
import { URLRuleManager } from "./URLRuleManager"
import { isFirefox } from "../utils/helper"
import { checkURLCondition } from "../utils/configUtils"
import { CaptureManager } from "notFirefox/background/CaptureManager"

declare global {
  interface Window {
    globalState?: GlobalState,
    globalMedia?: GlobalMedia,
    badgeMgr?: BadgeManager,
    portCapture?: PortCapture,
    captureMgr: CaptureManager,
    gsmMgr?: GsmManager,
    isBackground: boolean,
    commandListenerAdded: boolean,
    ruleManager: URLRuleManager,
    previousTabId: number,
    currentTabId: number
  }
}

async function main() {
  window.isBackground = true 
  window.portCapture = new PortCapture()

  let stateView: State 
  try {
    stateView = migrateSchema(((await getStorage("config")).config as State))
  } catch (err) {}

  stateView = stateView || getDefaultState()

  window.globalMedia = new GlobalMedia()
  window.globalState = new GlobalState(stateView)
  window.badgeMgr = new BadgeManager()
  window.ruleManager = new URLRuleManager()
  window.gsmMgr = new GsmManager(stateView.language)
  
  if (chrome.tabCapture && CaptureManager) {
    window.captureMgr = new CaptureManager()
  }

  chrome.runtime.onMessage.addListener(handleOnMessage)
  isFirefox() || chrome.commands.onCommand.addListener(handleCommand)

  chrome.tabs.onCreated.addListener(tab => {
    if (window.globalState.get({pinByDefault: true}).pinByDefault) {
      let openerId = tab.openerTabId
      if (!openerId) {
        openerId = window.currentTabId
        if (window.currentTabId === tab?.id) {
          openerId = window.previousTabId
        }
      }
      window.globalState.unfreeze()
      if (window.globalState.pins?.find(pin => pin.tabId === tab.id)) return 
      window.globalState.set([{tabId: tab.id, inheritContextFromTabId: openerId ?? null, override: {isPinned: true}}])
    }
  })
}

async function handleCommand(command: string) {
  if (!window.globalState.get({enabled: true}).enabled) return 
  const view = window.globalState.get({keybinds: true, keybindsUrlCondition: true})
  let keybinds = (view.keybinds || []).filter(kb => kb.enabled && kb.global && (kb.globalKey || "commandA") === command)

  if (!keybinds.length) return 
  const tabInfo = await getActiveTabInfo()
  const url = tabInfo?.url || ""

  if (view.keybindsUrlCondition && !checkURLCondition(url, view.keybindsUrlCondition, true)) {
    return 
  }


  keybinds = keybinds.filter(kb => {
    if (kb.condition?.parts.length > 0) {
      return checkURLCondition(url, kb.condition, true)
    } 
    return true 
  })

  processKeybinds(keybinds, tabInfo)
}

function handleOnMessage(msg: any, sender: chrome.runtime.MessageSender, reply: (msg: any) => any) {
  if (msg.type === "REQUEST_TAB_INFO") {
    reply({
      tabId: sender.tab.id,
      frameId: sender.frameId
    })
  } else if (msg.type === "REQUEST_CREATE_TAB") {
    chrome.tabs.create({
      url: msg.url
    })
    reply(true)
  } else if (msg.type === "REQUEST_SEND_MSG") {
    chrome.tabs.sendMessage(msg.tabId, msg.msg, msg.frameId == null ? {} : {frameId: msg.frameId})
    reply(true)
  } else if (msg.type === "TRIGGER_KEYBINDS") {
    let targets = window.globalState.get({keybinds: true}).keybinds.filter(kb => msg.ids.includes(kb.id))
    processKeybinds(targets, {tabId: sender.tab.id, frameId: sender.frameId, windowId: sender.tab.windowId})
    reply(true)
  }
}

async function handleInstall(detail: chrome.runtime.InstalledDetails) {
  chrome.runtime.onInstalled.removeListener(handleInstall)
  const tabs = await queryTabsSeveral({url: ["https://*/*", "http://*/*"]})
  if (!tabs) return 
  tabs.forEach(tab => {
    chrome.tabs.executeScript(tab.id, {file: "contentScript.js", allFrames: true}, () => {
      // if no permission, it will error, that's fine. 
      chrome.runtime.lastError
    })
  })
}

isFirefox() || chrome.runtime.onInstalled.addListener(handleInstall)
main()

