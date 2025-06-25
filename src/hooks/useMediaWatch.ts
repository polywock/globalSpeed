
import { useState, useEffect, useMemo } from "react"
import { MediaData, MediaPath, MediaScope, flattenMediaInfos } from "../contentScript/isolated/utils/genMediaInfo"
import { checkContentScript } from "src/utils/browserUtils"

type Env = {
  client: SubscribeMedia
}

export function useMediaWatch(): MediaData {
  const [watchInfo, setWatchInfo] = useState(null as MediaData)
  const env = useMemo<Env>(() => ({} as Env), [])

  useEffect(() => {
    env.client = new SubscribeMedia(gvar.tabInfo?.tabId, setWatchInfo)
    return () => {
      env.client.release()
      delete env.client
    }
  }, [])

  return watchInfo
}

const MINIMUM_DURATION = 10 

type SubscribeMediaCallback = (infos: MediaData) => void

export class SubscribeMedia {
  cbs: Set<SubscribeMediaCallback> = new Set()
  scopes: { [key: string]: MediaScope } = {}
  pinned: MediaPath
  latestData: MediaData
  released = false
  seenMedia: Set<string> = new Set()

  constructor(private tabId: number, cb: SubscribeMediaCallback) {
    cb && this.cbs.add(cb)
    this.start()
  }
  start = async () => {
    const raw = await chrome.storage.session.get()
    await Promise.all(Object.entries(raw).map(([key, value]) => this.processKeyForStart(key, value)))
    chrome.storage.session.onChanged.addListener(this.handleChange)
    this.handleChange(null)
  }
  processKeyForStart = async (key: string, value: any) => {
    if (!key.startsWith("m:")) return
    if (key.startsWith("m:pin")) {
      this.pinned = value
    } else if (key.startsWith("m:scope:")) {
      let info = value as MediaScope
      if (!info) return
      let status: boolean
      // False means frozen, null means no content script, and true is all good.
      if (status = await checkContentScript(info.tabInfo?.tabId, info.tabInfo.frameId)) {
        this.scopes[key] = value
      } else if (status == null) {
        chrome.storage.session.remove(key)
      }
    }
  }
  release = () => {
    if (this.released) return
    this.released = true
    delete this.latestData, delete this.scopes, delete this.seenMedia,
      delete this.triggerCbs, delete this.pinned
    chrome.storage.session.onChanged.removeListener(this.handleChange)
    this.cbs.clear()
  }
  handleChange = async (changes: chrome.storage.StorageChanges) => {
    let hadChanges = !changes
    changes = changes ?? {}

    for (let key in changes) {
      if (!key.startsWith("m:")) continue

      hadChanges = true
      if (key.startsWith("m:pin")) {
        this.pinned = changes[key].newValue
      } else if (key.startsWith("m:scope:")) {
        this.scopes[key] = changes[key].newValue
        if (this.scopes[key] == null) {
          delete this.scopes[key]
        }
      }
    }

    if (!hadChanges) return

    this.calcLatest()

    this.triggerCbs()
  }
  triggerCbs = () => {
    this.cbs.forEach(cb => cb(this.latestData))
  }
  calcLatest = () => {
    const toShow = new Set<string>()
    const pinnedKey = this.pinned?.key
    const infos = flattenMediaInfos(Object.values(this.scopes) as MediaScope[]).filter(info => info.readyState && (info.key === pinnedKey || info.duration > MINIMUM_DURATION)).sort((a, b) => {
      if (a.tabInfo.tabId === this.tabId) return -Infinity
      return a.tabInfo.tabId - b.tabInfo.tabId
    })

    // Add pinned, current tab items, and previously shown. 
    infos.forEach(info => {
      if ((info.key || "z") === pinnedKey || info.tabInfo.tabId === this.tabId || this.seenMedia.has(info.key)) {
        toShow.add(info.key)
      }
    })

    // Add three most recently played.
    infos.filter(info => info.tabInfo.tabId !== this.tabId && info.lastPlayed).sort((a, b) => {
      return b.lastPlayed - a.lastPlayed
    }).slice(0, 3).forEach(info => toShow.add(info.key))

    this.seenMedia = this.seenMedia.union(toShow)

    this.latestData = {
      infos: infos.filter(info => toShow.has(info.key)),
      pinned: this.pinned
    }
  }
}


