import 'regenerator-runtime/runtime'
import { updateBadges, clearPins, migrateSchema, getConfig, setPin } from "./utils"


chrome.runtime.onStartup.addListener(handleStartup) 
chrome.runtime.onInstalled.addListener(handleInstalled) 

chrome.storage.onChanged.addListener(updateBadges)
chrome.tabs.onActivated.addListener(updateBadges)
chrome.tabs.onUpdated.addListener(updateBadges)

chrome.runtime.onMessage.addListener(handleOnMessage)
chrome.tabs.onCreated.addListener(handleTabCreated)

async function handleStartup() {
  await migrateSchema()
  await clearPins()
  await updateBadges()
}

async function handleInstalled() {
  await migrateSchema()
  await updateBadges()
}

async function handleTabCreated(tab: chrome.tabs.Tab) {
  const config = await getConfig()
  if (config?.pinByDefault) {
    await setPin(config, tab.id)
    updateBadges()
  }
}

// Content scripts cannot access chrome.tabs property.
// To get tabId they need to request it from background script. 
function handleOnMessage(msg: any, sender: chrome.runtime.MessageSender, reply: (msg: any) => any) {
  if (msg.type === "REQUEST_TAB_ID") {
    reply(sender.tab.id)
  }
}

