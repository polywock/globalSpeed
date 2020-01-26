import 'regenerator-runtime/runtime'
import { setBadgeText, getStorage, getConfigOrDefault, getSpeed, getActiveTabId } from "./utils"
import { getDefaultConfig } from './defaults'

chrome.storage.onChanged.addListener(updateBadge)
chrome.tabs.onActivated.addListener(updateBadge)
chrome.runtime.onMessage.addListener(handleOnMessage)

migrateSchema()
updateBadge()

async function updateBadge() {
  const config = await getConfigOrDefault()
  const speed = getSpeed(config, await getActiveTabId())
  setBadgeText(speed.toString().slice(0, 4) + "x")
}

function handleOnMessage(msg: any, sender: chrome.runtime.MessageSender, reply: (msg: any) => any) {
  if (msg.type === "REQUEST_TAB_ID") {
    reply(sender.tab.id)
  }
}

// If our schema changes; migrate to new schema.
// eg. if we change a property name, we don't want existing users to lose their existing data.
async function migrateSchema() {
  let storage = await getStorage()

  // we no longer user speed property; need to migrate them to new schema.
  if (!storage.config && storage.speed) {
    const config = {...getDefaultConfig(), speed: storage.speed}
    chrome.storage.local.set({config, speed: undefined})
  }

  // update badge.
  updateBadge()
}










