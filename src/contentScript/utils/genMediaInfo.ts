import { TabInfo } from "../../utils/browserUtils"


export function generateMediaState(elem: HTMLMediaElement): MediaInfo {
  const rootNode = elem.getRootNode() as ShadowRoot | Document 

  const isVideo = elem instanceof HTMLVideoElement
  const w = (elem as HTMLVideoElement).videoWidth
  const h = (elem as HTMLVideoElement).videoHeight
  const videoSize = (isVideo && w && h) ? {w, h} : null
  
  return {
    key: elem.gsKey,
    isVideo,
    duration: elem.duration,
    infinity: elem.duration === Infinity || undefined,
    paused: elem.paused,
    volume: elem.volume,
    muted: elem.muted,
    pipMode: rootNode?.pictureInPictureElement === elem,
    shadowMode: rootNode instanceof ShadowRoot ? rootNode.mode : undefined,
    isConnected: elem.isConnected,
    readyState: elem.readyState,
    hasVideoTrack: !!(elem.videoTracks?.length ?? videoSize),
    hasAudioTrack: !!(elem.audioTracks?.length ?? true),
    videoSize,
    inLoop: !!elem.gsLoopTimeUpdateHandler,
    marks: Object.keys(elem.gsMarks || {}),
    intersectionRatio: videoSize && (elem as HTMLVideoElement).intersectionRatio
  }
}


export function generateScopeState(tabInfo: TabInfo, media: HTMLMediaElement[]): MediaScope {
  return {
    tabInfo: {...tabInfo},
    metaTitle: (navigator as any).mediaSession?.metadata?.title, 
    title:  document.title,
    domain: document.domain,
    url: document.URL,
    media: media.map(m => generateMediaState(m))
  }
}

export function flattenMediaInfos(scopes: MediaScope[]): FlatMediaInfo[] {
  const infos: FlatMediaInfo[] = []
  scopes?.forEach(scope => {
    scope.media?.forEach(media => {
      infos.push({...media, ...scope})
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
  pushTime?: number,
  latest?: string
}

export type MediaInfo = {
  key: string,
  isVideo?: boolean,
  duration: number,
  infinity: boolean,
  paused: boolean,
  volume: number,
  muted: boolean,
  pipMode: boolean,
  isConnected: boolean,
  shadowMode: ShadowRootMode,
  readyState: number,
  hasVideoTrack: boolean,
  hasAudioTrack: boolean,
  videoSize?: {w: number, h: number},
  inLoop?: boolean,
  marks: string[],
  intersectionRatio?: number
}

export type FlatMediaInfo = MediaScope & MediaInfo


