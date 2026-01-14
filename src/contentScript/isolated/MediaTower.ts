import { assertType, between, randomId } from "../../utils/helper"
import { conformSpeed } from "../../utils/configUtils"
import { applyMediaEvent, MediaEvent } from "./utils/applyMediaEvent"
import { generateScopeState } from "./utils/genMediaInfo"
import { IS_YOUTUBE } from "./utils/isWebsite"
import debounce from "lodash.debounce"
import { getShadow } from "src/utils/nativeUtils"

const EVENTS_LAST_PLAYED = new Set(['pause', 'playing', 'timeupdate'])

export class MediaTower {
  scopeStorageKey: string
  media: Set<HTMLMediaElement> = new Set()
  docs: Set<Window | ShadowRoot> = new Set()
  newDocCallbacks: Set<() => void> = new Set()
  forceSpeedCallbacks: Set<() => void> = new Set()
  observer: IntersectionObserver
  trackFps = true
  previousTimeUpdate: TimeUpdateInfo

  constructor() {
    this.processDoc(window)
    gvar.os.stratumServer.wiggleCbs.add(this.handleWiggle)
    IS_YOUTUBE && gvar.os.stratumServer.msgCbs.add(this.handleServerMessage)
    gvar.os.detectOpen.cbs.add(this.handleDetectOpen)
    window.addEventListener("beforeunload", this.handleUnload, { capture: true })
    window.addEventListener("blur", this.handleBlur, { capture: true, passive: true })
  }
  private handleDetectOpen = () => {
    this.observer?.disconnect()
    this.ensureEventListeners()
    window.addEventListener("beforeunload", this.handleUnload, { capture: true })
    window.addEventListener("blur", this.handleBlur, { capture: true, passive: true })
    this.handleUnload()
  }
  private handleUnload = () => {
    if (!this.scopeStorageKey) return
    try { chrome.storage.session.remove(this.scopeStorageKey) } catch (err) { }
  }
  private handleBlur = (e: PointerEvent) => {
    let doc: DocumentOrShadowRoot = document
    while (true) {
      doc = getShadow(doc.activeElement as HTMLElement)
      if (doc) {
        this.processDoc(doc as ShadowRoot)
      } else {
        break
      }
    }
  }
  private observe = (video: HTMLVideoElement) => {
    if (!window.IntersectionObserver) return
    this.observer = this.observer || new IntersectionObserver(this.handleObservation, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] })
    this.observer.observe(video)
  }
  private reobserve = (video: HTMLVideoElement) => {
    this.observer.unobserve(video)
    this.observer.observe(video)
  }
  reobserveAllVideos = () => {
    this.media.forEach(m => {
      if (m instanceof HTMLVideoElement && m.duration) this.reobserve(m)
    })
  }
  private handleObservation: IntersectionObserverCallback = entries => {
    entries.forEach(entry => {
      (entry.target as HTMLVideoElement).intersectionRatio = entry.intersectionRatio
    })
    this.sendUpdateDeb()

    if (gvar.os.circle) this.processEntriesForCircle()
  }
  private processEntriesForCircle = () => {
    const activeVideo = [...this.media].find(m => {
      return m.duration > 10 && m.isConnected && m instanceof HTMLVideoElement && m.intersectionRatio > 0.5
    }) as HTMLVideoElement

    if (activeVideo) {
      gvar.os.circle.start(activeVideo)
    } else {
      gvar.os.circle.stop()
    }
  }
  private handleWiggle = (parent: Node & ParentNode) => {
    if (parent instanceof ShadowRoot) {
      this.processDoc(parent)
    } else if (parent instanceof HTMLMediaElement) {
      this.processMedia(parent)
    }
  }
  private handleServerMessage = (data: Messages) => {
    if (data?.type === "YT_REQUEST_RATE") {
      const value = gvar.os.speedSync.latest?.speed
      value && gvar.os.stratumServer.send({ type: "YT_RATE_CHANGE", value })
    }
  }
  public processDoc = (doc: Window | ShadowRoot) => {
    if (this.docs.has(doc)) return
    this.docs.add(doc)
    this.ensureDocEventListeners(doc)
    this.newDocCallbacks.forEach(cb => cb())
  }
  private processMedia = (elem: HTMLMediaElement) => {
    if (this.media.has(elem)) return
    elem.gsKey = elem.gsKey || randomId()
    const rootNode = elem?.getRootNode()
    rootNode instanceof ShadowRoot && this.processDoc(rootNode)

    this.ensureMediaEventListeners(elem)
    elem instanceof HTMLVideoElement && this.observe(elem)
    this.media.add(elem)
    this.sendUpdate()

    this.forceSpeedCallbacks.forEach(cb => cb())
  }
  private ensureDocEventListeners = (doc: Window | ShadowRoot) => {
    doc.addEventListener("play", this.handleMediaEvent, { capture: true, passive: true })
    doc.addEventListener("playing", this.handleInterrupt, { capture: true, passive: true })
    doc.addEventListener("timeupdate", this.handleMediaEventTimeUpdate, { capture: true, passive: true })
    doc.addEventListener("pause", this.handleMediaEvent, { capture: true, passive: true })
    doc.addEventListener("volumechange", this.handleMediaEvent, { capture: true, passive: true })
    doc.addEventListener("loadedmetadata", this.handleMediaEvent, { capture: true, passive: true })
    doc.addEventListener("emptied", this.handleMediaEvent, { capture: true, passive: true })
    doc.addEventListener("enterpictureinpicture", this.handleMediaEvent, { capture: true, passive: true })
    doc.addEventListener("leavepictureinpicture", this.handleMediaEvent, { capture: true, passive: true })
    doc.addEventListener("fullscreenchange", this.handleMediaEvent, { capture: true, passive: true })
    doc.addEventListener("webkitfullscreenchange", this.handleMediaEvent, { capture: true, passive: true })
    doc.addEventListener("ratechange", this.handleMediaEvent, { capture: true, passive: true })
    IS_YOUTUBE && doc.addEventListener("ratechange", this.handleYoutubeRateChange, { capture: true, passive: true })
  }
  private ensureMediaEventListeners = (elem: HTMLMediaElement) => {
    elem.addEventListener("play", this.handleMediaEvent, { capture: true, passive: true })
    elem.addEventListener("playing", this.handleInterrupt, { capture: true, passive: true })
    elem.addEventListener("pause", this.handleMediaEvent, { capture: true, passive: true })
    elem.addEventListener("volumechange", this.handleMediaEvent, { capture: true, passive: true })
    elem.addEventListener("loadedmetadata", this.handleMediaEvent, { capture: true, passive: true })
    elem.addEventListener("emptied", this.handleMediaEvent, { capture: true, passive: true })
    elem.addEventListener("ratechange", this.handleMediaEvent, { capture: true, passive: true })
  }
  public ensureEventListeners = () => {
    this.docs.forEach(doc => this.ensureDocEventListeners(doc))
    this.media.forEach(media => this.ensureMediaEventListeners(media))
  }
  private handleYoutubeRateChange = (e: Event) => {
    const value = (e.target as HTMLMediaElement).playbackRate
    value && gvar.os.stratumServer.send({ type: "YT_RATE_CHANGE", value })
  }
  private handleInterrupt = (e: Event) => {
    if (e.processed) return
    e.processed = true
    delete this.previousTimeUpdate
    this.forceSpeedCallbacks.forEach(cb => cb())
  }
  private handleMediaEventTimeUpdate = (e: Event) => {
    if (!(e.target instanceof HTMLMediaElement)) return
    assertType<HTMLVideoElement>(e.target)

    if (this.trackFps) {
      const tu = {
        key: e.target.gsKey,
        time: performance.now(),
        frames: (e.target as any).webkitDecodedFrameCount ?? e.target.getVideoPlaybackQuality?.()?.totalVideoFrames
      }
      processFpsTracker(e.target, tu, this.previousTimeUpdate)
      this.previousTimeUpdate = tu
    } else {
      delete this.previousTimeUpdate
    }

    this.handleMediaEventDeb(e)
  }
  hiddenSpeedUpdateTimeout: number
  private handleMediaEvent = (e: Event) => {
    if (!(e?.isTrusted)) return
    if (e.processed) return
    e.processed = true

    let elem = e.target as HTMLMediaElement
    if (!elem || !(elem instanceof HTMLMediaElement)) return

    this.processMedia(elem)
    this.sendUpdate()

    if (e.type === "ratechange") {
      gvar.ghostMode && e.stopImmediatePropagation()
      delete (e.target as HTMLMediaElement).gsFpsCount
      delete (e.target as HTMLMediaElement).gsFpsSum
      // this.playbackChangeCallbacks.forEach(cb => cb())
    } else if (e.type === "emptied") {
      delete elem.gsMarks
      delete elem.gsNameless
    } else if (e.type === "pause" || e.type === "playing") {
      this.handleInterrupt(e)
    }

    if (EVENTS_LAST_PLAYED.has(e.type)) elem.gsLastPlayed = Date.now()

    if (gvar.os.circle && (e.type === "playing" || e.type === "loadedmetadata") && elem instanceof HTMLVideoElement) {
      this.reobserve(elem)
    }
  }
  private handleMediaEventDeb = debounce(this.handleMediaEvent, 5000, { leading: true, trailing: true, maxWait: 5000 })
  sendUpdate = () => {
    if (!chrome.runtime?.id) return gvar.os.handleOrphan()
    if (!gvar.tabInfo) return
    if (!this.scopeStorageKey) {
      this.scopeStorageKey = `m:scope:${gvar.tabInfo.tabId}:${gvar.tabInfo.frameId}`
    }
    const scope = generateScopeState(gvar.tabInfo, [...this.media])
    const override = { [this.scopeStorageKey]: scope }
    if (chrome.storage.session) {
      chrome.storage.session.set(override)
    } else {
      chrome.runtime.sendMessage({ type: "SET_SESSION", override } as Messages)
    }
  }
  private sendUpdateDeb = debounce(this.sendUpdate, 500, { leading: true, trailing: true, maxWait: 2000 })
  applyMediaEventTo = (event: MediaEvent, key?: string, longest?: boolean) => {
    let targets = [...this.media].filter(v => v.readyState)

    if (key) {
      targets = targets.filter(v => v.gsKey === key)
    } else if (longest) {
      targets = targets.sort((a, b) => b.duration - a.duration).slice(0, 1)
    }

    if (targets.length === 0) return

    let media = [...this.media]
    targets.forEach(state => {
      applyMediaEvent(media.find(v => v.gsKey === state.gsKey), event)
    })
  }
  applySpeedToAll = (speed: number, freePitch: boolean) => {
    if (!speed) return
    speed = conformSpeed(speed)
    this.media.forEach(media => {
      applyMediaEvent(media, { type: "PLAYBACK_RATE", value: speed, freePitch })
    })
  }
}

type TimeUpdateInfo = {
  key: string,
  time: number,
  frames: number
}


function processFpsTracker(e: HTMLVideoElement, tu: TimeUpdateInfo, ptu: TimeUpdateInfo) {
  if (!ptu || ptu.key !== tu.key) return

  const elapsed = tu.time - ptu.time
  const frames = tu.frames - ptu.frames
  const fps = (frames / (elapsed / 1000)) / e.playbackRate

  if (isNaN(fps)) return

  if (e.gsFpsCount > 5) {
    const storedFps = e.gsFpsSum / e.gsFpsCount
    if (!between(storedFps * 0.5, storedFps * 1.5, fps)) return
  }

  e.gsFpsSum = (e.gsFpsSum || 0) + fps
  e.gsFpsCount = (e.gsFpsCount || 0) + 1

  if (e.gsFpsCount > 200) {
    e.gsFpsSum /= 10
    e.gsFpsCount /= 10
  }
}