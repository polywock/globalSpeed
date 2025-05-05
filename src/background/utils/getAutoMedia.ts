import { FlatMediaInfo, MediaData, MediaDataWithScopes, MediaPath, MediaScope, flattenMediaInfos } from "src/contentScript/isolated/utils/genMediaInfo"
import { TabInfo, checkContentScript, compareFrame } from "src/utils/browserUtils"
import { fetchView } from "src/utils/state"

export async function getMediaDataWithScopes() {
    const raw = await chrome.storage.session.get()
    let pinned: MediaPath
    let scopes: MediaScope[] = []

    for (let key in raw) {
        if (!key.startsWith("m:")) continue 
        if (key.startsWith("m:pin")) {
            pinned = raw[key]
        } else if (key.startsWith("m:scope:")) {
            scopes.push(raw[key])
        }
    }
    return {pinned, scopes} satisfies MediaDataWithScopes
}

export async function clearClosed() {
  const [tabs, data] = await Promise.all([
      chrome.tabs.query({}),
      chrome.storage.session.get()
  ])
  const tabIds = new Set(tabs.map(t => t.id))
  const clearKeys: string[] = []
  for (let key in data) {
    if (!key.startsWith('m:scope:')) return 
    if (tabIds.has(data[key]?.tabInfo.tabId)) return 
    clearKeys.push(key)
  }
  chrome.storage.session.remove(clearKeys)
}

export async function getMediaData() {
  const d = await getMediaDataWithScopes()
  return {pinned: d.pinned, infos: flattenMediaInfos(d.scopes) } satisfies MediaData
}

export async function getAutoMedia (tabInfo: TabInfo, videoOnly?: boolean) {
  let [{ ignorePiP }, {infos, pinned}] = await Promise.all([
    fetchView({ignorePiP: true}),
    getMediaData()
  ])
  
  infos = infos.filter(info => info.readyState)
  infos = videoOnly ? infos.filter(info => info.videoSize) : infos 
  
  const pinnedInfo = infos.find(info => info.key === pinned?.key)
  if (pinnedInfo && await checkContentScript(pinnedInfo.tabInfo.tabId, pinnedInfo.tabInfo.frameId)) return pinnedInfo

  infos.sort((a, b) => b.creationTime - a.creationTime)
  let pippedInfo = infos.find(info => info.pipMode)

  if (pippedInfo && !(await checkContentScript(pippedInfo.tabInfo.tabId, pippedInfo.tabInfo.frameId))) {
    pippedInfo = null 
  }

  if (!ignorePiP && pippedInfo) return pippedInfo

  if (!tabInfo) return (pippedInfo || undefined)
  infos = infos.filter(info => info.tabInfo.tabId === tabInfo.tabId)

  if (!infos.length) return (pippedInfo || undefined)


  let peakIntersect = infos.filter(v => v.intersectionRatio != null).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]?.intersectionRatio

  let highest: {info: FlatMediaInfo, score: number}
  infos.forEach(info => {
    let score = 0

    const sameFrame = compareFrame(info.tabInfo, tabInfo)
    if (sameFrame && tabInfo.frameId !== 0) {
      score += 0b100000
    }
    if (info.intersectionRatio > 0.05 && info.intersectionRatio === peakIntersect) {
      score += 0b10000
    } else {
      if (info.intersectionRatio > 0.9) {
        score += 0b1000
      } else if (info.intersectionRatio > 0.5) {
        score += 0b100
      } else if (info.intersectionRatio > 0.1) {
        score += 0b10
      }
    }

    if (info.isVisible) {
      score += 0b10000
    }

    if (info.elementSize && info.elementSize.w > 200 && info.elementSize.h > 200) {
      score += 0b1000
    }
    if (info.infinity || info.duration >= 30 * 60) {
      score += 0b1000
    }
    if (info.duration >= 10 * 60) {
      score += 0b100
    }
    if (info.duration >= 3 * 60) {
      score += 0b10
    }
    if (info.duration >= 1 * 60) {
      score += 0b1
    }
    if (info.isVideo && location.hostname !== "www.spotify.com" && !info.isConnected) {
      score = -0b1
    }

    if (!highest || score > highest.score || (score === highest.score && (info.infinity ? 60 : info.duration) > highest.info.duration)) {
      highest = {info, score}
    }
  })

  return highest?.info
}