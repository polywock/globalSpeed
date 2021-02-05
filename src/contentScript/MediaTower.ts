import { randomId, round } from "../utils/helper";
import { conformSpeed } from "../utils/configUtils";
import { applyMediaEvent, MediaEvent } from "./utils/applyMediaEvent";
import { generateScopeState, generateMediaState } from "./utils/genMediaInfo";
import { MessageCallback } from "../utils/browserUtils";
import { WindowTalk, injectScript } from "./utils";
import debounce from "lodash.debounce";

export class MediaTower {
  media: HTMLMediaElement[] = []
  docs: (Window | ShadowRoot)[] = []
  canopy = chrome.runtime.connect({name: "MEDIA_CANOPY"})
  talk = new WindowTalk("GLOBAL_SPEED_CS", "GLOBAL_SPEED_CTX")
  newDocCallbacks: Set<() => void> = new Set()
  newMediaCallbacks: Set<() => void> = new Set()
  talkInitCb?: () => void
  constructor() {
    this.processDoc(window)
    this.talk.initCb = this.handleTalkInit
    chrome.runtime.onMessage.addListener(this.handleMessage)
  }
  private handleTalkInit = () => {
    const parasiteShadowRoot = document.querySelector("#GS_PARASITE")?.shadowRoot
    if (!parasiteShadowRoot) {
      console.error("Parasite not found!")
      return 
    }
    parasiteShadowRoot.addEventListener(`PARASITE_WIGGLE`, this.handleParasiteWiggle, {capture: true, passive: true})
    parasiteShadowRoot.host.remove()

    this.talkInitCb?.()
  }
  private handleParasiteWiggle = (e: CustomEvent) => {
    e.stopImmediatePropagation();
    const host = (e.target as ShadowRoot).host
    const parent = host.parentElement
    if (parent instanceof ShadowRoot) {
      this.processDoc(parent)
    } else if (parent instanceof HTMLMediaElement) {
      this.processMedia(parent)
    }
    host.remove()
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
    doc.addEventListener("play", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("timeupdate", this.handleMediaEventDeb, {capture: true, passive: true})
    doc.addEventListener("pause", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("volumechange", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("loadedmetadata", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("emptied", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("enterpictureinpicture", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("leavepictureinpicture", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("fullscreenchange", this.handleMediaEvent, {capture: true, passive: true})
    doc.addEventListener("ratechange", this.handleMediaEvent, {capture: true, passive: true})
    this.newDocCallbacks.forEach(cb => cb())
  }
  private processMedia = (elem: HTMLMediaElement) => {
    if (this.media.includes(elem)) return 
    elem.gsKey = elem.gsKey || randomId()
    
    elem.addEventListener("play", this.handleMediaEvent, {capture: true, passive: true})
    elem.addEventListener("pause", this.handleMediaEvent, {capture: true, passive: true})
    elem.addEventListener("ratechange", this.handleMediaEvent, {capture: true, passive: true})
    elem.addEventListener("volumechange", this.handleMediaEvent, {capture: true, passive: true})
    elem.addEventListener("loadedmetadata", this.handleMediaEvent, {capture: true, passive: true})
    elem.addEventListener("emptied", this.handleMediaEvent, {capture: true, passive: true})

    this.media.push(elem)
    this.sendUpdate()

    this.newMediaCallbacks.forEach(cb => cb())
  }
  lastEvent: Event
  private handleMediaEvent = (e: Event) => {
    if (!(e?.isTrusted)) return 
    if (this.lastEvent === e) return
    this.lastEvent = e 

    let elem = e.target as HTMLMediaElement
    if (!elem) return 
    if (elem.tagName !== "VIDEO" && elem.tagName !== "AUDIO") return 
    this.processMedia(elem)
    this.sendUpdate()

    if (e.type === "ratechange") {
      window.ghostMode && e.stopImmediatePropagation()
    } 
  }
  private handleMediaEventDeb = debounce(this.handleMediaEvent, 5000, {leading: true, trailing: true, maxWait: 5000})
  sendUpdate = () => {
    const scope = generateScopeState(window.tabInfo)
    scope.media = this.media.map(elem => generateMediaState(elem))
    chrome.runtime.sendMessage({type: "MEDIA_PUSH_SCOPE", value: scope})
  }
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




