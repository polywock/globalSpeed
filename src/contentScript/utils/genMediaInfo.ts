import { TabInfo, compareFrame } from "../../utils/browserUtils"
import { MediaPath } from "../../types"


export function generateMediaState(elem: HTMLMediaElement): MediaInfo {
  const w = (elem as HTMLVideoElement).videoWidth
  const h = (elem as HTMLVideoElement).videoHeight
  const videoSize = (elem.tagName === "VIDEO" && w && h) ? {w, h} : null
  const rootNode = elem.getRootNode()
  const pipMode = (rootNode as any as DocumentOrShadowRoot)?.pictureInPictureElement === elem
  const fsMode = (rootNode as any as DocumentOrShadowRoot)?.fullscreenElement === elem

  let shadowMode: ShadowRootMode

  if (rootNode instanceof ShadowRoot) {
    shadowMode = rootNode.mode
  }
  
  return {
    key: elem.gsKey,
    type: elem.tagName === "VIDEO" ? "VIDEO" : "AUDIO",
    duration: elem.duration,
    paused: elem.paused,
    volume: elem.volume,
    muted: elem.muted,
    pipMode,
    fsMode,
    shadowMode,
    isConnected: elem.isConnected,
    readyState: elem.readyState,
    hasVideoTrack: !!(elem.videoTracks?.length ?? videoSize),
    hasAudioTrack: !!(elem.audioTracks?.length ?? true),
    videoSize,
    inLoop: !!elem.gsLoopTimeUpdateHandler,
    marks: Object.keys(elem.gsMarks || {})
  }
}


export function generateScopeState(tabInfo: TabInfo): MediaScope {
  return {
    tabInfo: {...tabInfo},
    metaTitle: (navigator as any).mediaSession?.metadata?.title, 
    title:  document.title,
    domain: document.domain,
    url: document.URL
  }
}

export function flattenMediaInfos(scopes: MediaScope[], pinInfo: MediaPath): FlatMediaInfo[] {
  const infos: FlatMediaInfo[] = []
  scopes?.forEach(scope => {
    scope.media?.forEach(media => {
      const pinned = media.key === pinInfo?.key && compareFrame(pinInfo?.tabInfo, scope.tabInfo)
      infos.push({...media, ...scope, pinned})
    })
  })
  return infos 
}

export type MediaScope = {
  tabInfo: TabInfo
  url: string,
  domain: string,
  title: string,
  metaTitle?: string,
  media?: MediaInfo[],
  pushTime?: number
}

export type MediaInfo = {
  key: string,
  type: "VIDEO" | "AUDIO",
  duration: number,
  paused: boolean,
  volume: number,
  muted: boolean,
  pipMode: boolean,
  fsMode: boolean,
  isConnected: boolean,
  shadowMode: ShadowRootMode,
  readyState: number,
  hasVideoTrack: boolean,
  hasAudioTrack: boolean,
  videoSize?: {w: number, h: number},
  inLoop?: boolean,
  marks: string[],
  latestMovement?: boolean
}

export type FlatMediaInfo = MediaScope & MediaInfo & {pinned?: boolean}


