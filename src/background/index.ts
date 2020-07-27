import { migrateGrainData } from "../utils/migrateSchema"
import { BadgeManager } from './BadgeManager'
import { PortCapture } from './PortCapture'
import { getStorage, getActiveTabInfo } from '../utils/browserUtils'
import { getDefaultState } from '../defaults'
import { State } from '../types'
import { GsmManager } from "./GsmManager"
import { GlobalState } from "./GlobalState"
import { processKeybinds } from "./processKeybinds"
import { GlobalMedia } from "./GlobalMedia"
import { CaptureManager } from "./CaptureManager"
import { URLRuleManager } from "./URLRuleManager"
import { isFirefox } from "../utils/helper"

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
    ruleManager: URLRuleManager
  }
}

main()

async function main() {
  window.isBackground = true 
  window.portCapture = new PortCapture()
  let stateView = ((await getStorage()).config as State) || getDefaultState()
  stateView = migrateGrainData(stateView)
  window.globalMedia = new GlobalMedia()
  window.globalState = new GlobalState(stateView)
  window.badgeMgr = new BadgeManager()
  window.ruleManager = new URLRuleManager()
  window.gsmMgr = new GsmManager(stateView.language)
  
  if (chrome.tabCapture) {
    window.captureMgr = new CaptureManager()
  }

  chrome.runtime.onMessage.addListener(handleOnMessage)
  isFirefox() || chrome.commands.onCommand.addListener(handleCommand)

  chrome.tabs.onCreated.addListener(tab => {
    if (window.globalState.get({pinByDefault: true}).pinByDefault) {
      window.globalState.set({override: {isPinned: true}, tabId: tab.id})
    }
  })
}

async function handleCommand(command: string) {
  if (!window.globalState.get({enabled: true}).enabled) return 
  const keybinds = (window.globalState.get({keybinds: true}).keybinds || []).filter(kb => kb.enabled && kb.global && (kb.globalKey || "commandA") === command)
  if (!keybinds.length) return 
  const tabInfo = await getActiveTabInfo()
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


// once created ShadowRoot 
// Add element that ContentScript knows into ShadowRoot
// Make sure 
// 1. Tell contentScript 
// 2. Dispatch CustomEvent; contentScript will listen 