import { FlatMediaInfo, MediaData, MediaDataWithScopes, MediaPath, MediaScope, flattenMediaInfos } from "src/contentScript/isolated/utils/genMediaInfo"
import { TabInfo, checkContentScript, compareFrame } from "src/utils/browserUtils"
import { fetchView } from "src/utils/state"

const WEIGHTS = {
  SAME_FRAME: 0b10_000_000_000_000,
  IS_VISIBLE: 0b1_000_000_000_000,
  LARGE_VIDEO: 0b100_000_000_000,
  PEAK_INTERSECT: 0b100_000_000_000,
  INTERSECT_90: 0b10_000_000_000,
  INTERSECT_50: 0b1_000_000_000,
  INTERSECT_10: 0b100_000_000,
  ACTIVE: 0b100_000_000,
  DURATION_10M: 0b1000,
  DURATION_3M: 0b100,
  DURATION_1M: 0b10,
  DISQUALIFIED: -0b1
}

export async function getMediaDataWithScopes() {
  const raw = await chrome.storage.session.get<RecordAny>()
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
  return { pinned, scopes } satisfies MediaDataWithScopes
}

export async function clearClosed() {
  const [tabs, data] = await Promise.all([
    chrome.tabs.query({}),
    chrome.storage.session.get<RecordAny>()
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
  return { pinned: d.pinned, infos: flattenMediaInfos(d.scopes) } satisfies MediaData
}

export async function getAutoMedia(tabInfo: TabInfo, videoOnly?: boolean) {
  let [{ ignorePiP }, { infos, pinned }] = await Promise.all([
    fetchView({ ignorePiP: true }),
    getMediaData()
  ])

  infos = infos.filter(info => info.readyState)
  infos = videoOnly ? infos.filter(info => info.videoSize) : infos

  const pinnedInfo = infos.find(info => info.key === pinned?.key)
  if (pinnedInfo && await checkContentScript(pinnedInfo.tabInfo.tabId, pinnedInfo.tabInfo.frameId)) return pinnedInfo

  infos.sort((a, b) => b.creationTime - a.creationTime)
  let pippedInfo = infos.find(info => info.pipMode) || infos.find(info => info.isDip)

  if (pippedInfo && !(await checkContentScript(pippedInfo.tabInfo.tabId, pippedInfo.tabInfo.frameId))) {
    pippedInfo = null
  }

  if (!ignorePiP && pippedInfo) return pippedInfo

  if (!tabInfo) return (pippedInfo || undefined)
  infos = infos.filter(info => info.tabInfo.tabId === tabInfo.tabId)

  if (!infos.length) return (pippedInfo || undefined)

  const now = Date.now()
  let peakIntersect = infos.filter(v => v.intersectionRatio != null).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]?.intersectionRatio

  let highest: { info: FlatMediaInfo, score: number }
  infos.forEach(info => {
    let score = 0

    if (compareFrame(info.tabInfo, tabInfo) && tabInfo.frameId !== 0) score += WEIGHTS.SAME_FRAME
    if (info.isVisible) score += WEIGHTS.IS_VISIBLE
    if (!info.paused || (info.lastPlayed && (now - info.lastPlayed) < 60_000)) score += WEIGHTS.ACTIVE


    if (info.intersectionRatio > 0.1 && info.intersectionRatio === peakIntersect) {
      score += WEIGHTS.PEAK_INTERSECT
    } else if (info.intersectionRatio > 0.9) {
      score += WEIGHTS.INTERSECT_90
    } else if (info.intersectionRatio > 0.5) {
      score += WEIGHTS.INTERSECT_50
    } else if (info.intersectionRatio > 0.1) {
      score += WEIGHTS.INTERSECT_10
    }

    if (info.elementSize && info.elementSize.w > 200 && info.elementSize.h > 200) {
      score += WEIGHTS.LARGE_VIDEO
    }

    if (info.infinity || info.duration >= 10 * 60) {
      score += WEIGHTS.DURATION_10M
    } else if (info.duration >= 3 * 60) {
      score += WEIGHTS.DURATION_3M
    } else if (info.duration >= 1 * 60) {
      score += WEIGHTS.DURATION_1M
    }

    if (!info.isConnected && info.hasAudioTrack && info.domain === "open.spotify.com") score += WEIGHTS.SAME_FRAME

    if (!highest || score > highest.score || (score === highest.score && (info.infinity ? 60 : info.duration) > highest.info.duration)) {
      highest = { info, score }
    }
  })

  return highest?.info
}
