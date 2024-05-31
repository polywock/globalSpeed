import { TabInfo } from "../../../utils/browserUtils"


export function generateMediaState(elem: HTMLMediaElement): MediaInfo {
  const rootNode = elem.getRootNode() as ShadowRoot | Document 

  let info: MediaInfo = {
    key: elem.gsKey,
    duration: elem.duration,
    volume: elem.volume,
    readyState: elem.readyState,
    marks: Object.keys(elem.gsMarks || {}),
    playbackRate: elem.playbackRate
  }

  if (elem.duration === Infinity) info.infinity = true
  if (elem.isConnected) info.isConnected = true
  if (elem.paused) info.paused = true
  if (elem.muted) info.muted = true
  if (rootNode) {
    if (rootNode instanceof ShadowRoot) info.shadowMode = rootNode.mode 
    if (rootNode.pictureInPictureElement === elem) info.pipMode = true
    // let fs = rootNode.fullscreenElement
    // if (fs && (fs === elem || fs.contains(elem))) info.fsMode = true
  }
  if (elem.gsLoopTimeUpdateHandler) info.inLoop = true
  if (elem.gsSkipTimeUpdateHandler) info.inSkip = true

  if (elem instanceof HTMLVideoElement) {
    info.isVideo = true 
    
    const w = elem.videoWidth
    const h = elem.videoHeight
    if (w && h) {
      info.videoSize = {w, h}
      if (elem.intersectionRatio) info.intersectionRatio = elem.intersectionRatio
    }
    if (elem.isConnected) {
      try {
        info.isVisible = (elem.checkVisibility as any)({contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true})
      } catch {}

      let b = elem.isConnected ? elem.getBoundingClientRect() : null 
      if (b) info.elementSize = {w: b.width, h: b.height}

    }
    
    if (elem.gsFpsCount > 5) {
      const fps = elem.gsFpsSum / elem.gsFpsCount
      if (fps > 0) info.fps = fps 
    }

    if (elem.videoTracks?.length ?? w) info.hasVideoTrack = true 
    
  }

  if (
    (elem.duration && !info.isVideo) || 
    elem.audioTracks?.some(t => t.enabled) || 
    (elem as any).webkitAudioDecodedByteCount ||
    (elem as any).mozHasAudio
  ) info.hasAudioTrack = true 
  
  return info 
}


export function generateScopeState(tabInfo: TabInfo, media: HTMLMediaElement[]): MediaScope {
  return {
    tabInfo: {...tabInfo},
    metaTitle: (navigator as any).mediaSession?.metadata?.title, 
    title:  document.title,
    domain: location.hostname,
    url: document.URL,
    media: media.map(m => generateMediaState(m)),
    creationTime: Date.now()
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
  creationTime?: number,
  latest?: string
}

export type MediaInfo = {
  key: string,
  isVideo?: boolean,
  duration: number,
  infinity?: boolean,
  paused?: boolean,
  volume: number,
  muted?: boolean,
  pipMode?: boolean,
  fsMode?: boolean,
  isConnected?: boolean,
  shadowMode?: ShadowRootMode,
  readyState: number,
  hasVideoTrack?: boolean,
  hasAudioTrack?: boolean,
  videoSize?: {w: number, h: number},
  elementSize?: {w: number, h: number},
  isVisible?: boolean,
  inLoop?: boolean,
  inSkip?: boolean,
  marks: string[],
  intersectionRatio?: number,
  fps?: number,
  playbackRate: number
}

export type FlatMediaInfo = MediaScope & MediaInfo

export type MediaPath = {
  key: string,
  tabInfo: TabInfo
}

export type MediaData = {infos: FlatMediaInfo[], pinned: MediaPath} 

export type MediaDataWithScopes = {scopes: MediaScope[], pinned: MediaPath} 

