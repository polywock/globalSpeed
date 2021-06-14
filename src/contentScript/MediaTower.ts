import { randomId } from "../utils/helper";
import { conformSpeed } from "../utils/configUtils";
import { applyMediaEvent, MediaEvent } from "./utils/applyMediaEvent";
import { generateScopeState } from "./utils/genMediaInfo";
import { MessageCallback } from "../utils/browserUtils";
import { injectScript } from "./utils";
import debounce from "lodash.debounce";


export class MediaTower {
  media: HTMLMediaElement[] = []
  docs: (Window | ShadowRoot)[] = []
  canopy = chrome.runtime.connect({name: "MEDIA_CANOPY"})
  server = new StratumServer()
  newDocCallbacks: Set<() => void> = new Set()
  newMediaCallbacks: Set<() => void> = new Set()

  observer: IntersectionObserver
  constructor() {
    this.processDoc(window)
    this.server.wiggleCbs.add(this.handleWiggle)
    chrome.runtime.onMessage.addListener(this.handleMessage)
  }
  private observe = (video: HTMLVideoElement) => {
    if (!window.IntersectionObserver) return 
    this.observer = this.observer || new IntersectionObserver(this.handleObservation, {threshold: [0, 0.2, 0.4, 0.6, 0.8, 1]});
    this.observer.observe(video)
  }
  private handleObservation: IntersectionObserverCallback = entries => {
    entries.forEach(entry => {
      (entry.target as HTMLVideoElement).intersectionRatio = entry.intersectionRatio
    })
    this.sendUpdateDeb()
  }
  private handleWiggle = (parent: Node & ParentNode) => {
    if (parent instanceof ShadowRoot) {
      this.processDoc(parent)
    } else if (parent instanceof HTMLMediaElement) {
      this.processMedia(parent)
    }
  }
  private handleMessage: MessageCallback = (msg, sender, reply) => {
    if (msg.type === "APPLY_MEDIA_EVENT") {
      if (msg.key) {
        const elem = this.media.find(elem => elem.gsKey === msg.key)
        if (elem) {
          applyMediaEvent(elem, msg.event)
        } 
      } else {
        this.media.forEach(elem => {
          applyMediaEvent(elem, msg.event)
        })
      }

      reply(true); return 
    } else if (msg.type === "RUN_JS") {
      // used to run "javascript" URL rules
      injectScript(msg.value)
      reply(true); return 
    }
  }
  public processDoc = (doc: Window | ShadowRoot) => {
    if (this.docs.includes(doc)) return 
    this.docs.push(doc)
    this.ensureDocEventListeners(doc)
    this.newDocCallbacks.forEach(cb => cb())
  }
  private processMedia = (elem: HTMLMediaElement) => {
    if (this.media.includes(elem)) return 
    elem.gsKey = elem.gsKey || randomId()
    const rootNode = elem?.getRootNode()
    rootNode instanceof ShadowRoot && this.processDoc(rootNode)
  
    this.ensureMediaEventListeners(elem)
    elem instanceof HTMLVideoElement && this.observe(elem)
    this.media.push(elem)
    this.sendUpdate()

    this.newMediaCallbacks.forEach(cb => cb())
  }
  private ensureDocEventListeners = (doc: Window | ShadowRoot) => {
    doc.addEventListener("play", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("timeupdate", this.handleMediaEventDeb, {capture: true, passive: true})
    doc.addEventListener("pause", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("volumechange", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("loadedmetadata", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("emptied", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("enterpictureinpicture", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("leavepictureinpicture", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("fullscreenchange", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("webkitfullscreenchange", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("ratechange", this.handleMediaEvent, {capture: true, passive: true})
  }
  private ensureMediaEventListeners = (elem: HTMLMediaElement) => {
    elem.addEventListener("play", this.handleMediaEvent, {capture: true, passive: true})
    elem.addEventListener("pause", this.handleMediaEvent, {capture: true, passive: true})
    elem.addEventListener("ratechange", this.handleMediaEvent, {capture: true, passive: true})
    elem.addEventListener("volumechange", this.handleMediaEvent, {capture: true, passive: true})
    elem.addEventListener("loadedmetadata", this.handleMediaEvent, {capture: true, passive: true})
    elem.addEventListener("emptied", this.handleMediaEvent, {capture: true, passive: true})
  }
  public ensureEventListeners = () => {
    this.docs.forEach(doc => this.ensureDocEventListeners(doc))
    this.media.forEach(media => this.ensureMediaEventListeners(media))
  }
  private handleMediaEvent = (e: Event) => {
    if (!(e?.isTrusted)) return 
    if (e.processed) return 
    e.processed = true 
    
    let elem = e.target as HTMLMediaElement
    if (!(elem instanceof HTMLMediaElement)) return 


    this.processMedia(elem)
    this.sendUpdate()

    if (e.type === "ratechange") {
      gvar.ghostMode && e.stopImmediatePropagation()
    } else if (e.type === "emptied") {
      delete elem.gsMarks
      delete elem.gsNameless
    }
  }
  private handleMediaEventDeb = debounce(this.handleMediaEvent, 5000, {leading: true, trailing: true, maxWait: 5000})
  sendUpdate = () => {
    if (!gvar.tabInfo) return 
    const scope = generateScopeState(gvar.tabInfo, this.media)
    chrome.runtime.sendMessage({type: "MEDIA_PUSH_SCOPE", value: scope})
  }
  private sendUpdateDeb = debounce(this.sendUpdate, 500, {leading: true, trailing: true, maxWait: 2000})
  applyMediaEventTo = (event: MediaEvent, key?: string, longest?: boolean) => {
    let targets = this.media.filter(v => v.readyState)

    if (key) {
      targets = targets.filter(v => v.gsKey === key)
    } else if (longest) {
      targets = targets.sort((a, b) => b.duration - a.duration).slice(0, 1)
    }

    if (targets.length === 0) return 

    targets.forEach(state => {
      applyMediaEvent(this.media.find(v => v.gsKey === state.gsKey), event)
    })
  }
  applySpeedToAll = (speed: number, freePitch: boolean) => {
    if (!speed) return 
    speed = conformSpeed(speed)
    this.media.forEach(media => {
      applyMediaEvent(media, {type: "PLAYBACK_RATE", value: speed, freePitch})
    })
  }
}


class StratumServer {
  private parasite: HTMLDivElement
  private parasiteRoot: ShadowRoot
  wiggleCbs = new Set<(target: Node & ParentNode) => void>()
  msgCbs = new Set<(data: any) => void>()
  initCbs = new Set<() => void>()
  initialized = false 
  constructor() {
    window.addEventListener("GS_INIT", this.handleInit, true)
  }
  handleInit = (e: Event) => {
    if (!(e.target instanceof HTMLDivElement && e.target.id === "GS_PARASITE" && e.target.shadowRoot)) return 
    this.parasite = e.target
    this.parasiteRoot = this.parasite.shadowRoot
    this.parasite.remove()
    window.removeEventListener("GS_INIT", this.handleInit, true)
    this.parasiteRoot.addEventListener("GS_SERVER", this.handle, {capture: true})

    this.initialized = true 
    this.initCbs.forEach(cb => cb())
    this.initCbs.clear()
  }
  handle = (e: CustomEvent) => {
    e.stopImmediatePropagation()
    if (!(e.type === "GS_SERVER" && e.detail)) return
    let detail: any
    try {
      detail = JSON.parse(e.detail)
    } catch (err) {}


    if (detail.type === "WIGGLE") {
      const parent = this.parasite.parentNode
      if (parent) {
        this.parasite.remove()
        this.wiggleCbs.forEach(cb => cb(parent))
      }
    } else if (detail.type === "MSG") {
      this.msgCbs.forEach(cb => cb(detail.data || {}))
    }
  }
  send = (data: any) => {
    this.parasiteRoot.dispatchEvent(new CustomEvent("GS_CLIENT", {detail: JSON.stringify(data)}))
  }
}