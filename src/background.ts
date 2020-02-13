import 'regenerator-runtime/runtime'
import { updateBadges, getConfig, setPin, startupCleanUp, persistConfig } from "./utils/configUtils"
import { migrateSchema } from "./utils/migrateSchema"
import { isFirefox } from './utils/helper'

const URL_PATTERNS = ["http://*/*", "https://*/*", "file:///*"]

chrome.runtime.onStartup.addListener(handleStartup) 
chrome.runtime.onInstalled.addListener(handleInstalled) 

chrome.storage.onChanged.addListener(updateBadges)
chrome.tabs.onActivated.addListener(updateBadges)
chrome.tabs.onUpdated.addListener(updateBadges)

chrome.runtime.onMessage.addListener(handleOnMessage)
chrome.tabs.onCreated.addListener(handleTabCreated)


async function handleStartup() {
  await migrateSchema()
  await startupCleanUp()
  await updateBadges()
}


async function handleInstalled(e: chrome.runtime.InstalledDetails) {
  await migrateSchema()
  await updateBadges()

  // Firefox reinjects automatically. 
  if (isFirefox()) {
    return 
  }

  URL_PATTERNS.forEach(pattern => {
    chrome.tabs.query({url: pattern}, tabs => {
      tabs.forEach(tab => {
        chrome.tabs.executeScript(tab.id, {
          file: "contentScript.js",
          allFrames: true 
        })
      }) 
    })
  })
}


async function handleTabCreated(tab: chrome.tabs.Tab) {
  const config = await getConfig()
  if (config?.pinByDefault) {
    setPin(config, "on", tab.id)
    persistConfig(config)
    updateBadges()
  }
}

function handleOnMessage(msg: any, sender: chrome.runtime.MessageSender, reply: (msg: any) => any) {
  
  if (msg.type === "REQUEST_SENDER_INFO") {
    reply({
      tabId: sender.tab.id,
      frameId: sender.frameId
    })
  } else if (msg.type === "REQUEST_CREATE_TAB") {
    chrome.tabs.create({
      url: msg.url
    })
  } 
}


// Need this, otherwise ports instantly close.
chrome.runtime.onConnect.addListener(async port => {})