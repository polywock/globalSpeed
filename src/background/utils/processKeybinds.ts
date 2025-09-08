import { Keybind, Command, StateView, StateViewSelector, AdjustMode, ReferenceValues, MediaProbe, ItcInit, Duration, KeybindMatch, Trigger } from "../../types"
import { CommandName, commandInfos } from "../../defaults/commands"
import { sendMessageToConfigSync, intoFxFlags, sendMediaEvent, isSeekSmall } from "../../utils/configUtils"
import { checkContentScript, TabInfo } from "../../utils/browserUtils"
import type { MediaEvent, MediaEventCinema } from "../../contentScript/isolated/utils/applyMediaEvent"
import { round, clamp, formatDuration, isFirefox, wraparound, timeout } from "../../utils/helper"
import { FlatMediaInfo } from "../../contentScript/isolated/utils/genMediaInfo"
import { getDefaultAudioFx, getDefaultFx } from "../../defaults"
import { filterInfos } from "../../defaults/filters"
import { produce } from "immer"
import { PushViewInit, fetchView, pushView } from "../../utils/state"
import { getAutoMedia } from "./getAutoMedia"
import { initTabCapture, isTabCaptured, releaseTabCapture } from "./tabCapture"
import { hashWithStoredSalt } from "src/utils/hash"
import { IndicatorShowOpts } from "src/contentScript/isolated/utils/Indicator"
import { KeepAlive } from "./KeepAlive"


let lastSeek: {key: string, time: number, net: number}

export class ProcessKeybinds {
  globalHideIndicator: boolean
  shortcutHideIndicator = false 
  loadedMedia?: {value: FlatMediaInfo}
  loadedMediaVideo?: {value: FlatMediaInfo}
  stopped = false 
  itcList: ItcInit[] = []
  immediateItc = false 
  constructor(private matches: KeybindMatch[], public tabInfo: TabInfo) {
    this.init()
  }
  stop = () => {
    this.stopped = true 
  }
  init = async () => {
    this.globalHideIndicator = (await gvar.es.getAllUnsafe())['g:hideIndicator']
    this.immediateItc = this.matches.some(m => m.kb.command === "nothing" && m.kb.valueNumber != null)

    for (let match of this.matches) { 
      if (this.stopped) return 
      await this.processKeybindMatch(match)
    }

    this.flushItcList()
  }
  fetch = async (selector: StateViewSelector) => {
    return fetchView(selector, this.tabInfo?.tabId)
  }
  push = async (override: StateView, extraInit?: PushViewInit) => {
    return pushView({override, tabId: this.tabInfo?.tabId, ...(extraInit ?? null)})
  }
  show = async (opts: IndicatorShowOpts) => {
    if (!this.tabInfo) return 
    if (this.shortcutHideIndicator) return 

    sendMessageToConfigSync({type: "SHOW_INDICATOR", opts, requiresFocus: this.tabInfo.frameId == null ? true : false}, this.tabInfo.tabId, this.tabInfo.frameId)
  }
  processItc = (init: ItcInit) => {
    if (this.immediateItc) {
      this.sendItcs([init])
      return 
    } 
    this.itcList.push(init)
  }
  flushItcList = () => {
    if (!this.itcList.length) return
    this.sendItcs(this.itcList)
    this.itcList = []
  }
  sendItcs = (inits: ItcInit[]) => {
    chrome.tabs.sendMessage(this.tabInfo.tabId, {
      type: "ITC",
      inits 
    } as Messages)
  }
  applyToMedia = async (e: MediaEvent, requiresVideo = false) => {
    const media = await this.getMediaAny(requiresVideo)
    if (!media) return 
    sendMediaEvent(e, media.key, media.tabInfo.tabId, media.tabInfo.frameId)
  }
  getMediaAny = async (requiresVideo = false) => {
    if (this.loadedMedia) return this.loadedMedia.value
    this.loadedMedia = {value: await getAutoMedia(this.tabInfo, requiresVideo)}
    return this.loadedMedia.value
  }
  getMediaVideo = async () => {
    if (this.loadedMediaVideo) return this.loadedMediaVideo.value
    this.loadedMediaVideo = {value: await getAutoMedia(this.tabInfo, true)}
    return this.loadedMediaVideo.value
  }
  autoCaptureWithCheck = (c: Command, value: number) => {
    if (c.valueType === "adjustMode" && value?.toFixed(6) !== c.ref.default.toFixed(6)) {
      this.autoCapture()
    }
  }
  autoCapture = () => {
    if (this.tabInfo?.tabId == null) return 
    initTabCapture(this.tabInfo.tabId)
  }
  processKeybindMatch = async (match: KeybindMatch) => {
    let kb = match.kb
    let commandInfo = commandInfos[kb.command]
    let media: FlatMediaInfo

    
    if (commandInfo.requiresVideo) {
      media = await this.getMediaVideo()
      if (!media) return 
    } else if (commandInfo.requiresMedia) {
      media = await this.getMediaAny()
      if (!media) return 
    }

    let override: StateView = {}
    this.shortcutHideIndicator = kb.invertIndicator ? !this.globalHideIndicator : this.globalHideIndicator  
    await commandHandlers[kb.command]({media, override, commandInfo, kb, isAlt: match.alt, ...this})
    if (Object.keys(override).length) await pushView({override, tabId: this.tabInfo?.tabId})
  }
}

type CommandHandlerArgs = ProcessKeybinds & {
  media: FlatMediaInfo,
  override: StateView,
  kb: Keybind, 
  commandInfo: Command,
  isAlt?: boolean
} 

let nothingSymbolMap: {[key: string]: Symbol} = {}
let nothingLastCalledAt: {[key: string]: number} = {}

const commandHandlers: {
  [key in CommandName]: (args: CommandHandlerArgs) => Promise<void>
} = {
  nothing: async args => {
    if (!(args.kb.valueNumber > 0)) return

    const now = Date.now() 
    
    // first in series, make it 0.35
    let delay = args.kb.valueNumber

    if (delay < 0.35)  {
      let delta = now - nothingLastCalledAt[args.kb.id]
      if (delta > 300 || isNaN(delta)) {
        delay = 0.35 
      }
      nothingLastCalledAt[args.kb.id] = now
    }

    let symbol = Symbol()
    nothingSymbolMap[args.kb.id] = symbol 
    delay > 10 && KeepAlive.start(delay / 60 + 0.5)
    await timeout(delay * 1000)
    if (nothingSymbolMap[args.kb.id] !== symbol) {
      args.stop()
    }
  },
  runCode: async args => {
    const { kb, tabInfo } = args
    if (!tabInfo || !(await checkContentScript(tabInfo.tabId, tabInfo.frameId || 0))) return

    if (isFirefox()) {
      chrome.tabs.sendMessage(tabInfo.tabId, {type: "RUN_JS", value: kb.valueString}, {frameId: 0})
    } else {
      try {
        chrome.userScripts.execute({
          injectImmediately: true,
          js: [{code: kb.valueString}],
          world: 'MAIN',
          target: {
            tabId: tabInfo.tabId,
            frameIds: [0]
          }
        })
      } catch {}
    }
  },
  openUrl: async args => {
    const { kb, tabInfo } = args 
    let url = kb.valueString

    if (kb.valueUrlMode === "sameTab") {
      if (!tabInfo) return 
      chrome.tabs.update(tabInfo.tabId, {url})
      return 
    }

    let active = (kb.valueUrlMode || "fgTab") === "fgTab"
    if (active || kb.valueUrlMode === "bgTab") {
      let index = tabInfo?.tabId ? (await chrome.tabs.get(tabInfo.tabId)).index + 1 : undefined
      chrome.tabs.create({
        url,
        index,
        active
      })
      return 
    }

    let popup = kb.valueUrlMode === "newPopup"
    if (popup || kb.valueUrlMode === "newWindow") {
      chrome.windows.create({
        url,
        type: popup ? 'popup' : 'normal',
        ...(kb.valuePopupRect || {})
      })
    }
  },
  intoPopup: async args => {
    const { kb, tabInfo } = args 
    if (!tabInfo.tabId) return 
    const tab = await chrome.tabs.get(tabInfo.tabId)
    const window = await chrome.windows.get(tab.windowId)
    const storageKey = `s:popup:${tab.id}`

    if (window.type === "popup") {
      let recoverInfo = (await chrome.storage.session.get(storageKey))[storageKey]
      await chrome.windows.create({tabId: tab.id, type: "normal", state: "normal", ...(recoverInfo ? {width: 50, height: 50} : {})})
      if (!recoverInfo) return 
      try {
        await chrome.windows.get(recoverInfo.windowId)
      } catch (err) { return } 
      
      await chrome.tabs.move(tab.id, {windowId: recoverInfo.windowId, index: recoverInfo.index})
      chrome.tabs.update(tab.id, {active: true})
      return 
    } 
    chrome.storage.session.set({[storageKey]: {windowId: window.id, index: tab.index, state: window.state}})
    await chrome.windows.create({
      type: 'popup',
      tabId: tab.id,
      ...(kb.valuePopupRect || {})
    })
  },
  muteTab: async args => {
    if (!args.tabInfo?.tabId) return 
    let tabId = args.tabInfo.tabId
    const isMuted = (await chrome.tabs.get(tabId))?.mutedInfo?.muted
    args.show({text: isMuted ? '100%' : '0%'})
    chrome.tabs.update(tabId, {muted: !isMuted})
  },
  state: async args => {
    const { kb, show, override, fetch } = args 
    const view = await fetch({enabled: true, latestViaShortcut: true})
    override.latestViaShortcut = true 
    if (kb.valueState === "off" || (kb.valueState === "toggle" && view.enabled)) {
      override.enabled = false 
    } else {
      override.enabled = true
    }
    show({
      text: ` ${override.enabled ? "on" : "off"}`,
      icons: ["power"]
    })
  },
  pin: async args => {
    const { kb, tabInfo, override, show, fetch } = args 
    if (!tabInfo) return
    const view = await fetch({isPinned: true})
    if (kb.valueState === "off" || (kb.valueState === "toggle" && view.isPinned)) {
      override.isPinned = false 
    } else {
      override.isPinned = true 
    }
    show({text: override.isPinned ? "local" : "global", small: true})
  },
  speed: async args => {
    return processAdjustMode(args)
  },
  temporarySpeed: async ({media, show, kb, commandInfo }) => {
    const factor = round(kb.valueNumber || commandInfo.ref.default, 2)
    show({text: `${factor}x`})
    activateTemporarySpeed(media, factor)
  },
  speedChangesPitch: async args => {
    const { kb, show, override, fetch } = args 
    const view = await fetch({freePitch: true})
    if (kb.valueState === "off" || (kb.valueState === "toggle" && view.freePitch)) {
      override.freePitch = false 
    } else {
      override.freePitch = true  
    }
    show({
      text: ` ${override.freePitch ? "on" : "off"}`,
      icons: ["speedChangesPitch"]
    })
  },
  seek: async args => {
    return processAdjustMode(args)
  },
  pause: async args => {
    const { kb, media, applyToMedia, show } = args 
    if (kb.valueState === "off" || (kb.valueState === "toggle" && media.paused)) {
      show({icons: ["play"]})
    } else {
      show({icons: ["pause"]})
    }

    applyToMedia({type: "PAUSE", state: kb.valueState})
  },
  mute: async args => {
    const { kb, media, applyToMedia, show } = args 

    if (kb.valueState === "off" || (kb.valueState === "toggle" && media.muted)) {
      show({text: `${Math.round(media.volume * 100)}%`})
    } else {
      show({text: "0%"})
    }

    applyToMedia({type: "MUTE", state: kb.valueState}) 
  },
  volume: async args => {
    return processAdjustMode(args)
  },
  setMark: async args => {
    const { kb, applyToMedia, show } = args 
    let text = ` ${kb.valueString}`
    let icons: IndicatorShowOpts["icons"] = ["bookmark"]


    switch (kb.valueString?.toLowerCase()) {
      case "::nameless": 
        text = " nameless"
        break
      case "::nameless-prev":
        text = " prev" 
        icons = ["arrowLeft"]
        break
      case "::nameless-next":
        text = " next"
        icons = ["arrowRight"]
        break 
    }

    show({
      icons,
      text,
      small: true
    })
    applyToMedia({type: "SET_MARK", key: kb.valueString})
  },
  seekMark: async args => {
    const { media, kb, applyToMedia, show } = args 
    let hasMark = media.marks.includes(kb.valueString)
    let jumpTo: number 

    if (!hasMark) {
      let key = `s:mark:${kb.valueString}:${await hashWithStoredSalt(media.domain, 6)}`
      const item = (await chrome.storage.session.get(key))[key] as SessionMark
      if (item) {
        if (Math.abs(media.duration - item.duration) < 2) {
          jumpTo = item.current
          hasMark = true 
        }
      }
    }

    show({
      icons:  hasMark ? ["arrowRight"] : ["bookmark"],
      text: ` ${kb.valueString}`,
      small: true
    })
    applyToMedia({type: "SEEK_MARK", key: jumpTo ?? kb.valueString, fast: kb.fastSeek})
  },
  loopEntire: async args => {
    const { media, kb, applyToMedia, show } = args 

    let probe = (await chrome.tabs.sendMessage(media.tabInfo.tabId, {type: "MEDIA_PROBE", key: media.key} as Messages, {frameId: media.tabInfo.frameId || 0})) as MediaProbe

    let on = (!probe.fullyLooped && kb.valueState === "toggle") || kb.valueState === "on"

    show({
      icons: ["loop"],
      text: ` ${on ? 'on' : 'off'}`,
      small: true,
    })
    applyToMedia({type: "LOOP_ENTIRE", key: media.key, state: on ? 'on' : 'off'})
  },
  loop: async args => {
    const { media, kb, applyToMedia, show } = args 
    if (media.marks.includes(kb.valueString)) {
      show({
        icons: ["loop"],
        text: ` ${media.inLoop ? "off" : "on"}`,
        small: true,
      })
      applyToMedia({type: "TOGGLE_LOOP", key: kb.valueString, indicator: !args.shortcutHideIndicator, ignoreNavigate: kb.ignoreNavigate})
      return 
    } 

    show({
      icons: ["loop"],
      text: ` ${kb.valueString}???`,
      small: true,
    })
  },
  skip: async args => {
    const { media, kb, applyToMedia, show } = args 
    if (media.marks.includes(kb.valueString)) {
      show({
        icons: ["skip"],
        text: ` ${media.inSkip ? "off" : "on"}`,
        small: true,
      })
      applyToMedia({type: "TOGGLE_LOOP", key: kb.valueString, skipMode: true, indicator: !args.shortcutHideIndicator, ignoreNavigate: kb.ignoreNavigate})
      return 
    } 

    show({
      icons: ["skip"],
      text: ` ${kb.valueString}???`,
      small: true,
    })
  },
  fullscreen: async args => {
    const { kb, applyToMedia, media, tabInfo, fetch } = args 

    // TODO: Seek clarification
    let captureMode = false 

    if (chrome.offscreen && chrome.tabCapture && !media.fsMode) {
      const captured = await isTabCaptured(tabInfo.tabId)
      if (captured) {
        let view = await fetch({audioFx: true, audioFxAlt: true})
        if (view.audioFx && (view.audioFx.pitch !== 0 || view.audioFx.volume !== 1 || view.audioFx.delay !== 0 || view.audioFx.eq.enabled)) {
          captureMode = true 
          await releaseTabCapture(tabInfo.tabId)
          await timeout(100)
        }
      }
    }
    applyToMedia({type: "FULLSCREEN", direct: kb.direct}) 

    if (captureMode) {
      await timeout(250)
      await initTabCapture(tabInfo.tabId)
    }
  },
  PiP: async args => {
    const { kb, applyToMedia } = args 
    applyToMedia({type: "PIP", state: kb.valueState}) 
  },
  cinema: async args => {
    const { kb, applyToMedia, media } = args 
    const event = {type: "CINEMA", state: kb.valueState, color: kb.valueString, opacity: kb.valueNumber, roundness: kb.valueNumberAlt} as MediaEventCinema
    if (media.tabInfo.frameId > 0) {
      await chrome.tabs.sendMessage(media.tabInfo.tabId, {type: "CINEMA", event} as Messages, {frameId: 0})
    }
    applyToMedia(event) 
  },
  mediaInfo: async ({ applyToMedia }) => {
    applyToMedia({type: "MEDIA_INFO"}) 
  },
  fxState: async args => {
    const { kb, fetch, override, show } = args
    let view = await fetch({elementFx: true, backdropFx: true})
    
    const flags = intoFxFlags(kb.filterTarget)
    if (flags.element) {
      view.elementFx = view.elementFx ?? getDefaultFx()
      const enabled = kb.valueState === "on" || (kb.valueState === "toggle" && !view.elementFx.enabled)
      override.elementFx = {...view.elementFx, enabled}
    } 
    if (flags.backdrop) {
      view.backdropFx = view.backdropFx ?? getDefaultFx()
      const enabled = kb.valueState === "on" || (kb.valueState === "toggle" && !view.backdropFx.enabled)
      override.backdropFx = {...view.backdropFx, enabled} 
    }

    show({
      icons: ["power"]
    })
  },
  fxReset: async args => {
    const { kb, show, override } = args 
    const flags = intoFxFlags(kb.filterTarget)
    if (flags.element) {
      override.elementFx = null 
    } 
    if (flags.backdrop) {
      override.backdropFx = null 
    }
  },
  fxSwap: async args => {
    const { fetch, show, override } = args 
    const view = await fetch({backdropFx: true, elementFx: true})
    override.elementFx = view.backdropFx
    override.backdropFx = view.elementFx
    show({icons: ["swap"]})
  },
  fxFilter: async args => {
    return processAdjustMode(args)
  },
  drawPage: async args => {
    const { tabInfo } = args 
    if (!tabInfo) return 
    chrome.scripting.executeScript({target: {tabId: tabInfo.tabId, allFrames: false}, files: ["pageDraw.js"]})
  },
  afxPitch: async args => {
    return processAdjustMode(args)
  },
  afxGain: async args => {
    return processAdjustMode(args)
  },
  afxDelay: async args => {
    return processAdjustMode(args)
  },
  afxPan: async args => {
    return processAdjustMode(args)
  },
  afxMono: async args => {
    const { kb, fetch, show, override, autoCapture } = args 

    const view = await fetch({monoOutput: true})
    if (kb.valueState === "off" || (kb.valueState === "toggle" && view.monoOutput)) {
      override.monoOutput = false 
    } else {
      override.monoOutput = true  
    }
    override.monoOutput && autoCapture()
    show({
      text: ` ${override.monoOutput ? "on" : "off"}`
    })
  },
  afxCapture: async args => {
    const { kb, show, tabInfo } = args 
    if (!tabInfo) return

    let state = "off"

    const captured = await isTabCaptured(tabInfo.tabId)
    
    try {
      if (kb.valueState === "off") {
        releaseTabCapture(tabInfo.tabId)
      } else if (kb.valueState === "on") {
        initTabCapture(tabInfo.tabId)
        state = "on"
      } else {
        captured ? releaseTabCapture(tabInfo.tabId) : initTabCapture(tabInfo.tabId)
        state = captured ? "off" : "on"
      }
    } catch (err ) {
      return 
    }

    show({text: state})
  },
  afxReset: async args => {
    const { show, tabInfo, override } = args 
    if (!tabInfo) return

    const captured = await isTabCaptured(tabInfo.tabId)
    captured ? releaseTabCapture(tabInfo.tabId) : initTabCapture(tabInfo.tabId)
    override.audioFx = getDefaultAudioFx()
    override.audioFxAlt = override.audioPan = null
    show({icons: ["reset"]})
  },
}

type SessionMark = {
  duration: number,
  current: number 
}

async function processAdjustMode(args: CommandHandlerArgs) {
  const { fetch, override, kb, commandInfo: command, show, media, applyToMedia, tabInfo } = args 
  const adjustMode = kb.adjustMode || AdjustMode.SET

  if (adjustMode === AdjustMode.ITC || adjustMode === AdjustMode.ITC_REL) {
    let init = await getItcInit(args)
    if (!init) return 

    chrome.tabs.sendMessage(tabInfo.tabId, {
      type: "ITC",
      inits: [init]
    } as Messages)
    return 
  }

  const ref = command.ref || command.getRef(command, kb)

  let value: number
  let isRelative = false  

  if (adjustMode === AdjustMode.SET) {
    value = kb.valueNumber ?? ref.default
    if (kb.command === "speed") {
      let view = (await fetch({speed: true, lastSpeed: true}))
      if (!kb.skipToggleSpeed && (view.speed?.toFixed(2) === value.toFixed(2) && view.lastSpeed != null)) {
        value = view.lastSpeed
      }
    }
  } else if (kb.adjustMode === AdjustMode.ADD) {
    value = kb.valueNumber ?? ref.step
    isRelative = true 
  } else if (kb.adjustMode === AdjustMode.CYCLE) {
    value = await getCycle(args)
  } 

  if (value == null || isNaN(value)) {
    throw Error("Value not NULL or NaN.")
  }

  let pretext: string = ''
  let text: string = ''
  let icons: IndicatorShowOpts["icons"] = []
  
  if (kb.command === "seek") {
    let valueContext = isRelative ? Math.abs(value) : value 
    if (isRelative) {
      icons.push(value < 0 ? 'arrowLeft' : 'arrowRight')
    } else {
      pretext = '='
    }
    
    const frame = 1 / (media.fps ?? 24) 
    const percent = media.duration / 100 
    let seconds = value 
    let isSmall = isSeekSmall(kb, ref)

    if (kb.duration === Duration.FRAMES) {
      seconds = value * frame
      text = ` ${round(valueContext, 2)}f`
    } else if (kb.duration === Duration.PERCENT) {
      seconds = value * percent
      text = ` ${round(valueContext, 0)}%`
    } else [
      text = ` ${round(valueContext, 2)}`
    ]

    if (isRelative && kb.relativeToSpeed) {
      seconds *= media.playbackRate
    }

    if (kb.showNetDuration) {
      const now = Date.now()
      let net = 0; 
      if (lastSeek && lastSeek.key === media.key && lastSeek.time + 750 > now) {
        net = lastSeek.net
      }
      net += seconds 
      lastSeek = {key: media.key, time: now, net}
      text = formatDuration(net, true)
      icons = []
    }
 
    
    applyToMedia({type: "SEEK", relative: isRelative, value: seconds, fast: kb.fastSeek, autoPause: isSmall ? !kb.skipPauseSmall : kb.autoPause, wraparound: kb.wraparound})
    show({text: text || "", icons: icons || [], preText: pretext || ''})
    return 
  } 

  let main: number 
  let secondary: number 

  // handle relative 
  if (isRelative) {
    let values = await getValues(args)
    if (!values) return 
    
    if ((values.secondary ?? values.main) != null) {
      main = value + (values.main ?? values.secondary)
      secondary = value + (values.secondary ?? values.main)
    }
  } else {
    main = secondary = value 
  }

  // set value 
  await setValue({kb, mediaKey: media?.key, mediaTabInfo: media?.tabInfo, tabInfo, value: main, valueAlt: secondary, shouldShow: !args.shortcutHideIndicator, ref, wasDirect: true})
}

async function getItcInit(args: CommandHandlerArgs): Promise<ItcInit> {
  const { kb, commandInfo: command, tabInfo, media  } = args 
  const ref = command.ref || command.getRef(command, kb) 

  let init: ItcInit = {
    relative: kb.adjustMode === AdjustMode.ITC_REL,
    seekOnce: kb.seekOnce,
    resetTo: ref.reset ?? ref.default,
    min: ref.min,
    max: ref.max,
    sliderMin: kb.valueItcMin ?? ref.sliderMin,
    sliderMax: kb.valueItcMax ?? ref.sliderMax,
    step: kb.valueNumber ?? ref.itcStep,
    shouldShow: !args.shortcutHideIndicator,
    dontReleaseKeyUp: (kb.trigger || Trigger.LOCAL) === Trigger.LOCAL ? kb.noHold : undefined,
    kb
  } 

  if (kb.command === "seek" || kb.command === "volume") {
    if (!tabInfo || !media.duration) return
    delete init.resetTo

    let probe = (await chrome.tabs.sendMessage(media.tabInfo.tabId, {type: "MEDIA_PROBE", key: media.key} as Messages, {frameId: media.tabInfo.frameId || 0})) as MediaProbe
    if (!probe) return 

    init.mediaKey = media.key
    init.mediaTabInfo = media.tabInfo
    init.mediaDuration = probe.duration

    if (kb.command === "seek") {

      // convert context aware units to seconds. 
      init.min = 0
      delete init.max
      init.original = probe.currentTime
      init.wasPaused = probe.paused

      if (kb.duration === Duration.PERCENT) {
        init.sliderMin = init.sliderMin / 100 * probe.duration
        init.sliderMax = init.sliderMax / 100 * probe.duration
        init.step = init.step / 100 * probe.duration
      } else if (kb.duration === Duration.FRAMES) {
        let frame = 1 / (probe.fps ?? 24) 
        init.sliderMin = init.sliderMin * frame
        init.sliderMax = init.sliderMax * frame
        init.step = init.step * frame 
      }

      if (init.relative && kb.relativeToSpeed) { 
        init.step = init.step * (media.playbackRate || 1)
      }
    } else {
      init.original = probe.volume
    }
  } else {
    let values = await getValues(args)
    if (!values) return 
    
    if (values.main != null) init.original = values.main
    if (values.secondary != null) init.originalAlt = values.secondary
  }


  return init
}

async function getCycle(args: CommandHandlerArgs) {
  const { fetch, override, kb, isAlt  } = args 
  let keybinds = (await fetch({keybinds: true})).keybinds || []

  if (!kb.valueCycle?.length) return null 
  const cycleLength = kb.valueCycle.length 
  let newIndex = (kb.cycleIncrement ?? 0) + (isAlt ? -1 : 1) 
  if (!kb.cycleNoWrap) {
    if (newIndex < 0) {
      newIndex = cycleLength - 1
    } else if (newIndex >= cycleLength) {
      newIndex = 0 
    }
  }
  newIndex = clamp(0, cycleLength - 1, newIndex)

  override.keybinds = produce(keybinds, d => {
    d.find(v => v.id === kb.id).cycleIncrement = newIndex
  })

  return kb.valueCycle?.[newIndex]
}


const afxContinous = new Set(['afxPitch', 'afxGain', 'afxDelay', 'afxPan'])
const afxMapping: {[key: string]: 'pitch' | 'volume' | 'delay'} = {
  'afxPitch': 'pitch',
  'afxGain': 'volume',
  'afxDelay': 'delay'
}

async function getValues(args: CommandHandlerArgs): Promise<{main?: number, secondary?: number}> {
  const { kb, media, fetch, commandInfo } = args
  if (kb.command === 'volume') {
    return {main: media.volume}
  } else if (kb.command === 'speed') {
    return {main: (await fetch({speed: true})).speed}
  } else if (kb.command === 'fxFilter') {
    const view = await fetch({elementFx: true, backdropFx: true})
    const info = filterInfos[kb.filterOption]

    return {
      main: (view.elementFx || getDefaultFx())[info.isTransform ? 'transforms' : 'filters'].find(f => f.name === kb.filterOption).value,
      secondary: (view.backdropFx || getDefaultFx())[info.isTransform ? 'transforms' : 'filters'].find(f => f.name === kb.filterOption).value
    }
  } else if (afxContinous.has(kb.command)) {
    const view = await fetch({audioFx: true, audioFxAlt: true, audioPan: true})
    if (kb.command === 'afxPan') {
      return {main: view.audioPan ?? commandInfo.ref.default}
    }
    let key = afxMapping[kb.command as keyof typeof afxMapping]
    return {
      main: view.audioFx ? (view.audioFx[key] ?? commandInfo.ref.default) : undefined,
      secondary: view.audioFxAlt ? (view.audioFxAlt[key] ?? commandInfo.ref.default) : undefined
    }
  }
}

export type SetValueInit = {
  kb: Keybind,
  value?: number,
  valueAlt?: number,
  tabInfo: TabInfo,
  mediaKey?: string,
  mediaTabInfo?: TabInfo,
  shouldShow?: boolean,
  ref?: ReferenceValues,
  dry?: boolean,
  showAlt?: boolean,
  wasRelative?: boolean,
  wasDirect?: boolean,
  mediaDuration?: number
}

export async function setValue(init: SetValueInit) {
  let { tabInfo, kb, mediaKey, mediaTabInfo, value, valueAlt, ref  } = init 
  if (value == null && valueAlt == null) return 
  const command = commandInfos[kb.command]
  
  ref = ref || command.ref || command.getRef?.(command, kb.command === "seek" ? {duration: Duration.SECS} as any : kb)
  let max = kb.command === "seek" ? init.mediaDuration : ref.max

  let shouldWrap = init.wasDirect ? kb.wraparound : kb.itcWraparound


  if (value != null) {
    value = (ref.wrappable && init.wasRelative && shouldWrap && max != null && ref.min != null) ? wraparound(ref.min, max, value) : clamp(ref.min, ref.max, value)
  }

  if (valueAlt != null) {
    valueAlt = (ref.wrappable && init.wasRelative && shouldWrap) ? wraparound(ref.min, ref.max, valueAlt) : clamp(ref.min, ref.max, valueAlt)
  }

  let override: StateView = {}

  if (kb.command === "speed") {
    override.lastSpeed = (await fetchView({speed: true}, tabInfo.tabId)).speed
    if (override.lastSpeed === value) delete override.lastSpeed
    override.speed = value 
  } else if (kb.command === "volume") {
    init.dry || sendMediaEvent({type: 'SET_VOLUME', value, relative: false}, mediaKey, mediaTabInfo.tabId, mediaTabInfo.frameId)
  } else if (kb.command === "seek") {
    init.dry || sendMediaEvent({type: 'SEEK', value, fast: kb.fastSeek}, mediaKey, mediaTabInfo.tabId, mediaTabInfo.frameId)
  } else if (kb.command === "fxFilter") {
    const view = await fetchView({elementFx: true, backdropFx: true}, init.tabInfo?.tabId)
    const { element, backdrop } = intoFxFlags(kb.filterTarget)
    const filterInfo = filterInfos[kb.filterOption]
    const star = filterInfo.isTransform ? 'transforms' : 'filters'
    if (element && value != null) {
      override.elementFx = produce(view.elementFx || getDefaultFx(), d => {
        d[star].find(f => f.name === kb.filterOption).value = value
        if (value.toFixed(6) !== ref.default.toFixed(6)) d.enabled = true 
      })
    }
    if (backdrop && valueAlt != null) {
      override.backdropFx = produce(view.backdropFx || getDefaultFx(), d => {
        d[star].find(f => f.name === kb.filterOption).value = valueAlt
        if (valueAlt.toFixed(6) !== ref.default.toFixed(6)) d.enabled = true 
      })
    }

  } else if (kb.command === "afxPan") {
    override.audioPan = value 

    let command = commandInfos[kb.command]
    if (value?.toFixed(6) !== command.ref.default.toFixed(6)) initTabCapture(tabInfo.tabId)

  } else if (afxContinous.has(kb.command)) {
    const view = await fetchView({audioFx: true, audioFxAlt: true}, tabInfo?.tabId)
    let command = commandInfos[kb.command]

    if (
      (value != null && value?.toFixed(6) !== command.ref.default.toFixed(6)) || 
      (valueAlt != null && valueAlt.toFixed(6) !== command.ref.default.toFixed(6))
    ) init.dry || initTabCapture(tabInfo.tabId)
    
    if (view.audioFx && value != null) {
      override.audioFx = produce(view.audioFx, d => {
        d[afxMapping[kb.command]] = value
      })
    }

    if (view.audioFxAlt && valueAlt != null) {
      override.audioFxAlt = produce(view.audioFxAlt, d => {
        d[afxMapping[kb.command]] = valueAlt 
      })
    }


  }

  if (!init.dry && Object.keys(override)) await pushView({override, tabId: tabInfo.tabId})
  
  value = value ?? valueAlt

  let text = `${round(value, 2)}`
  let icons: IndicatorShowOpts['icons'] = []
  let preText: string = ''
  if (kb.command === "volume" || kb.command === "afxGain") {
    text = `${round(value * 100, 0)}%`
  } else if (kb.command === "seek") {
    text = `${formatDuration(value)}`
  }else if (kb.command === "speed") {
    if (!text.includes('.')) {
      text = `${text}.0`
    }
  }

  if (init.shouldShow && text.length + icons.length) {
    showIndicator({text: text || "", icons: icons || [], preText}, tabInfo.tabId, init.showAlt)
  }
}

function showIndicator(opts: IndicatorShowOpts, tabId: number, showAlt?: boolean) {
  sendMessageToConfigSync({type: "SHOW_INDICATOR", opts, showAlt}, tabId, 0)
}


let tempSpeedTimeoutId: number 
function activateTemporarySpeed(media: FlatMediaInfo, factor: number) {
  chrome.tabs.sendMessage(media.tabInfo.tabId, {
      type: 'SET_TEMPORARY_SPEED',
      factor 
  } as Messages, {frameId: media.tabInfo.frameId})
  clearTimeout(tempSpeedTimeoutId)

  tempSpeedTimeoutId = setTimeout(() => {
    chrome.tabs.sendMessage(media.tabInfo.tabId, {
        type: 'SET_TEMPORARY_SPEED'
    } as Messages, {frameId: media.tabInfo.frameId})
  }, 150)
}