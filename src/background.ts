import 'regenerator-runtime/runtime'
import { updateBadges, setPin, startupCleanUp, persistConfig, getConfigOrDefault, getContext } from "./utils/configUtils"
import { migrateSchema } from "./utils/migrateSchema"
import { isFirefox } from './utils/helper'
import { getMessages } from "./utils/i18"
import { StorageChanges } from './utils/browserUtils'
import { Config } from './types'

const URL_PATTERNS = ["http://*/*", "https://*/*", "file:///*"]

let audioCtx: AudioContext
let allCapturedCtx: CaptureContext[] = []


chrome.runtime.onStartup.addListener(handleStartup) 
chrome.runtime.onInstalled.addListener(handleInstalled) 

chrome.storage.onChanged.addListener(updateBadges)
chrome.tabs.onActivated.addListener(updateBadges)
chrome.tabs.onUpdated.addListener(updateBadges)

chrome.runtime.onMessage.addListener(handleOnMessage)
chrome.tabs.onCreated.addListener(handleTabCreated)
chrome.tabs.onRemoved.addListener(handleTabRemoved)
chrome.storage.onChanged.addListener(handleStorageChange)


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


function handleStorageChange(changes: StorageChanges) {
  const newConfig: Config = changes?.config?.newValue
  if (!newConfig) return 

  for (let i = allCapturedCtx.length - 1; i >= 0; i--) {
    let captureCtx = allCapturedCtx[i]
    
    let ctx = getContext(newConfig, captureCtx.tabId)
    if (ctx.volume == null) {
      captureCtx.stream.getAudioTracks().forEach(track => {
        track.stop()
      })
      allCapturedCtx.splice(i, 1)
    } else {
      captureCtx.gainNode.gain.value = ctx.volume
    }
  }
}

async function handleTabCreated(tab: chrome.tabs.Tab) {
  const config = await getConfigOrDefault()
  if (config?.pinByDefault) {
    setPin(config, "on", tab.id)
    persistConfig(config)
    updateBadges()
  }
}


async function handleTabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {
  const config = await getConfigOrDefault()
  if (config.pipInfo?.tabId === tabId) {
    delete config.pipInfo
    persistConfig(config)
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
  } else if (msg.type === "REQUEST_GSM") {
    getMessages(msg.language).then(gsm => {
      reply(gsm)
    })
    return true 
  } else if (msg.type === "PIP_ENTER") {
    getConfigOrDefault().then(config => {
      config.pipInfo = {
        tabId: sender.tab.id,
        frameId: sender.frameId
      }
      persistConfig(config)
    })
  } else if (msg.type === "PIP_LEAVE") {
    getConfigOrDefault().then(config => {
      delete config.pipInfo
      persistConfig(config)
    })
  }  else if (msg.type === "PIP_FEED") {
    getConfigOrDefault().then(config => {
      chrome.tabs.sendMessage(config.pipInfo.tabId, {type: "APPLY_MEDIA_EVENT", value: msg.msg})
    })
  } else if (msg.type === "CAPTURE_TAB") {
    if (msg.tabId == null) return 
    if (allCapturedCtx.find(ctx => ctx.tabId === msg.tabId)) return 
    captureTab(msg.tabId).then(captureCtx => {
      allCapturedCtx.push(captureCtx)
      captureCtx.gainNode.gain.value = msg.volume ?? 1
    })
  }
}


// Need this, otherwise ports instantly close.
chrome.runtime.onConnect.addListener(async port => {})

function captureTab(tabId: number): Promise<CaptureContext> {
  return new Promise((res, rej) => {
    chrome.tabCapture.capture({audio: true}, stream => {
      if (chrome.runtime.lastError) {
        return rej(chrome.runtime.lastError)
      }

      audioCtx = audioCtx || new AudioContext()
      let ctx: CaptureContext = {
        tabId: tabId,
        stream,
        streamSrc: audioCtx.createMediaStreamSource(stream),
        gainNode: audioCtx.createGain()
      }
  
      ctx.streamSrc.connect(ctx.gainNode)
      ctx.gainNode.connect(audioCtx.destination)
      res(ctx)
    })
  })
}


type CaptureContext = {
  tabId?: number, 
  stream?: MediaStream
  streamSrc?: MediaStreamAudioSourceNode
  gainNode?: GainNode
}