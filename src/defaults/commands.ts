
import { MAX_SPEED_CHROMIUM, MIN_SPEED_CHROMIUM } from "./constants"
import { Command, Keybind, AdjustMode, CommandGroup, Duration, Trigger } from "../types"
import { randomId, isFirefox, getPopupSize, isMobile } from "../utils/helper"
import { filterInfos } from "./filters"

export type CommandName = "nothing" | "runCode" | "openUrl" | "intoPopup" |
  "speed" | "speedChangesPitch" | "pin" | "state" | 
  "seek" | "pause" | "mute" | "muteTab" | "volume" | "setMark" | "seekMark" | "loop" | "skip" | 
  "fullscreen" | "PiP" | "mediaInfo" | "cinema" | "loopEntire" |
  "fxState" | "fxReset" | "fxSwap" | "fxFilter" | "drawPage" |
  "afxGain" | "afxPitch" | "afxDelay" | "afxPan" | "afxMono" | "afxCapture"  | "afxReset"


export let commandInfos: {[key in CommandName]: Command} = {
  nothing: {
    group: CommandGroup.MISC,
    valueType: 'number',
    ref: {
      default: 0,
      min: 0,
      max: 600
    },
    generate: () => ({
      id: randomId(),
      command: "nothing",
      enabled: true,
      greedy: true
    })
  },
  runCode: {
    group: CommandGroup.MISC,
    valueType: "modalString",
    generate: () => ({
      id: randomId(),
      command: "runCode",
      enabled: true,
      greedy: true,
      valueString: `// code here`
    })
  },
  openUrl: {
    group: CommandGroup.MISC,
    valueType: "string",
    generate: () => ({
      id: randomId(),
      command: "openUrl",
      enabled: true,
      greedy: true,
      valueString: "https://example.com"
    })
  },
  intoPopup: {
    group: CommandGroup.MISC,
    generate: () => ({
      id: randomId(),
      command: "intoPopup",
      enabled: true,
      greedy: true,
      valuePopupRect: getPopupSize()
    })
  },
  speed: {
    valueType: "adjustMode",
    hasFeedback: true,
    ref: {
      min: MIN_SPEED_CHROMIUM,
      max: MAX_SPEED_CHROMIUM,
      step: 0.1,
      default: 1,
      sliderMin: 0.5,
      sliderMax: 1.5,
      itcStep: 1,
      wrappable: true
    },
    generate: () => ({
      id: randomId(),
      command: "speed",
      enabled: true,
      greedy: true
    })
  },
  speedChangesPitch: {
    valueType: "state",
    hasFeedback: true,
    requiresMedia: true,
    generate: () => ({
      id: randomId(),
      command: "speedChangesPitch",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  pin: {
    valueType: "state",
    hasFeedback: true,
    generate: () => ({
      id: randomId(),
      command: "pin",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  state: {
    valueType: "state",
    hasFeedback: true,
    generate: () => ({
      id: randomId(),
      command: "state",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  seek: {
    group: CommandGroup.MEDIA,
    withDuration: true,
    valueType: "adjustMode",
    requiresMedia: true,
    hasFeedback: true,
    getRef: (command, kb) => {
      const duration = kb.duration || Duration.SECS
      if (duration === Duration.SECS) {
        return {
          min: 0,
          default: 300,
          itcStep: 60,
          step: 10,
          sliderMin: 0,
          sliderMax: 10 * 60,
          wrappable: true
        }
      } else if (duration === Duration.PERCENT) {
        return {
          min: 0,
          max: 100,
          default: 50,
          step: 10,
          itcStep: 50,
          sliderMin: 0,
          sliderMax: 100,
          wrappable: true
        }
      } else if (duration === Duration.FRAMES) {
        return {
          min: 0,
          default: 240,
          step: 1,
          itcStep: 2_400,
          sliderMin: 0,
          sliderMax: 14_000,
          wrappable: true
        }
      }
    },
    generate: () => ({
      id: randomId(),
      adjustMode: AdjustMode.ADD,
      command: "seek",
      enabled: true,
      greedy: true,
      valueNumber: 10
    })
  },
  pause: {
    group: CommandGroup.MEDIA,
    valueType: "state",
    requiresMedia: true,
    hasFeedback: true,
    generate: () => ({
      id: randomId(),
      command: "pause",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  mute: {
    group: CommandGroup.MEDIA,
    hasFeedback: true,
    valueType: "state",
    requiresMedia: true,
    generate: () => ({
      id: randomId(),
      command: "mute",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  muteTab: {
    group: CommandGroup.MEDIA,
    hasFeedback: true,
    valueType: "state",
    requiresMedia: true,
    generate: () => ({
      id: randomId(),
      command: "muteTab",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  volume: {
    group: CommandGroup.MEDIA,
    hasFeedback: true,
    valueType: "adjustMode",
    requiresMedia: true,
    ref: {
      min: 0,
      max: 1,
      step: 0.05,
      default: 0.5,
      sliderMin: 0,
      sliderMax: 1,
      itcStep: 0.5,
      wrappable: true
    },
    generate: () => ({
      id: randomId(),
      adjustMode: AdjustMode.ADD,
      command: "volume",
      enabled: true,
      greedy: true
    })
  },
  setMark: {
    group: CommandGroup.MEDIA,
    hasFeedback: true,
    valueType: "string",
    requiresMedia: true,
    generate: () => ({
      id: randomId(),
      command: "setMark",
      enabled: true,
      greedy: true,
      valueString: "mark1"
    })
  },
  seekMark: {
    group: CommandGroup.MEDIA,
    hasFeedback: true,
    valueType: "string",
    requiresMedia: true,
    generate: () => ({
      id: randomId(),
      command: "seekMark",
      enabled: true,
      greedy: true,
      valueString: "mark1"
    })
  },
  loop: {
    group: CommandGroup.MEDIA,
    hasFeedback: true,
    valueType: "string",
    requiresMedia: true,
    generate: () => ({
      id: randomId(),
      command: "loop",
      enabled: true,
      greedy: true,
      valueString: "mark1"
    })
  },
  skip: {
    group: CommandGroup.MEDIA,
    hasFeedback: true,
    valueType: "string",
    requiresMedia: true,
    generate: () => ({
      id: randomId(),
      command: "skip",
      enabled: true,
      greedy: true,
      valueString: "mark1"
    })
  },
  fullscreen: {
    group: CommandGroup.MEDIA,
    requiresVideo: true,
    generate: () => ({
      id: randomId(),
      command: "fullscreen",
      enabled: true,
      greedy: true
    })
  },
  PiP: {
    group: CommandGroup.MEDIA,
    valueType: "state",
    requiresVideo: true,
    requiresPiPApi: true,
    generate: () => ({
      id: randomId(),
      command: "PiP",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  cinema: {
    group: CommandGroup.MEDIA,
    valueType: "state",
    requiresVideo: true,
    generate: () => ({
      id: randomId(),
      command: "cinema",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  mediaInfo: {
    group: CommandGroup.MEDIA,
    requiresMedia: true,
    generate: () => ({
      id: randomId(),
      command: "mediaInfo",
      enabled: true,
      greedy: true
    })
  },
  loopEntire: {
    group: CommandGroup.MEDIA,
    requiresMedia: true,
    valueType: "state",
    generate: () => ({
      id: randomId(),
      command: "loopEntire",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  fxState: {
    group: CommandGroup.FX,
    hasFeedback: true,
    withFilterTarget: true,
    valueType: "state",
    generate: () => ({
      id: randomId(),
      command: "fxState",
      enabled: true,
      greedy: true,
      valueState: "toggle",
      filterTarget: "element"
    })
  },
  fxReset: {
    group: CommandGroup.FX,
    hasFeedback: true,
    withFilterTarget: true,
    generate: () => ({
      id: randomId(),
      command: "fxReset",
      enabled: true,
      greedy: true,
      filterTarget: "element"
    })
  },
  fxSwap: {
    group: CommandGroup.FX,
    hasFeedback: true,
    generate: () => ({
      id: randomId(),
      command: "fxSwap",
      enabled: true,
      greedy: true
    })
  },
  fxFilter: {
    group: CommandGroup.FX,
    hasFeedback: true,
    valueType: "adjustMode",
    withFilterOption: true,
    withFilterTarget: true,
    getRef: (command, kb) => {
      return command.withFilterOption && filterInfos[kb.filterOption]?.ref
    },
    generate: () => ({
      id: randomId(),
      command: "fxFilter",
      filterOption: "hueRotate",
      enabled: true,
      greedy: true,
      filterTarget: "element",
      adjustMode: AdjustMode.ADD
    })
  },
  drawPage: {
    group: CommandGroup.FX,
    generate: () => ({
      id: randomId(),
      command: "drawPage",
      enabled: true,
      greedy: true
    })
  },
  afxGain: {
    group: CommandGroup.AUDIO_FX,
    hasFeedback: true,
    valueType: "adjustMode",
    requiresTabCapture: true,
    ref: {
      min: 0,
      max: 16,
      step: 0.05,
      default: 1,
      sliderMin: 0,
      sliderMax: 3,
      itcStep: 1.5
    },
    generate: () => ({
      id: randomId(),
      command: "afxGain",
      enabled: true,
      greedy: true,
      adjustMode: AdjustMode.ADD
    })
  },
  afxPitch: {
    group: CommandGroup.AUDIO_FX,
    hasFeedback: true,
    valueType: "adjustMode",
    requiresTabCapture: true,
    ref: {
      min: -100,
      max: 100,
      step: 1,
      default: 0,
      sliderMin: -6,
      sliderMax: 6,
      itcStep: 3
    },
    generate: () => ({
      id: randomId(),
      command: "afxPitch",
      enabled: true,
      greedy: true,
      adjustMode: AdjustMode.ADD
    })
  },
  afxDelay: {
    group: CommandGroup.AUDIO_FX,
    hasFeedback: true,
    valueType: "adjustMode",
    requiresTabCapture: true,
    ref: {
      min: 0,
      max: 60,
      step: 0.05,
      default: 0,
      sliderMin: 0,
      sliderMax: 5,
      itcStep: 2.5
    },
    generate: () => ({
      id: randomId(),
      command: "afxDelay",
      enabled: true,
      greedy: true,
      adjustMode: AdjustMode.ADD
    })
  },
  afxPan: {
    group: CommandGroup.AUDIO_FX,
    hasFeedback: true,
    valueType: "adjustMode",
    requiresTabCapture: true,
    ref: {
      min: -1,
      max: 1,
      step: 0.05,
      default: 0,
      sliderMin: -1,
      sliderMax: 1,
      itcStep: 1,
      wrappable: true 
    },
    generate: () => ({
      id: randomId(),
      command: "afxPan",
      enabled: true,
      greedy: true,
      adjustMode: AdjustMode.ADD
    })
  },
  afxMono: {
    group: CommandGroup.AUDIO_FX,
    hasFeedback: true,
    valueType: "state",
    requiresTabCapture: true,
    generate: () => ({
      id: randomId(),
      command: "afxMono",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  afxCapture: {
    group: CommandGroup.AUDIO_FX,
    hasFeedback: true,
    valueType: "state",
    requiresTabCapture: true,
    generate: () => ({
      id: randomId(),
      command: "afxCapture",
      enabled: true,
      greedy: true,
      valueState: "toggle",
      trigger: Trigger.GLOBAL
    })
  },
  afxReset: {
    group: CommandGroup.AUDIO_FX,
    hasFeedback: true,
    requiresTabCapture: true,
    generate: () => ({
      id: randomId(),
      command: "afxReset",
      enabled: true,
      greedy: true
    })
  }
}


export function getDefaultKeybinds(): Keybind[] {
  if (isMobile()) return []
  
  let kbs: Keybind[] = [
    {
      ...commandInfos.speed.generate(),
      key: "KeyA",
      adjustMode: AdjustMode.ADD,
      valueNumber: -0.1
    },
    {
      ...commandInfos.speed.generate(),
      key: "KeyS",
      valueNumber: 1
    },
    {
      ...commandInfos.speed.generate(),
      key: "KeyD",
      adjustMode: AdjustMode.ADD,
      valueNumber: 0.1,
      spacing: 1
    },
    {
      ...commandInfos.seek.generate(),
      key: "KeyZ",
      adjustMode: AdjustMode.ADD,
      valueNumber: -5
    },
    {
      ...commandInfos.seek.generate(),
      key: "KeyX",
      adjustMode: AdjustMode.ADD,
      spacing: 1
    },
    {
      ...commandInfos.seek.generate(),
      key: {shiftKey: true, code: "KeyZ"},
      adjustMode: AdjustMode.ADD,
      duration: Duration.FRAMES,
      valueNumber: -1
    },
    {
      ...commandInfos.seek.generate(),
      key: {shiftKey: true, code: "KeyX"},
      adjustMode: AdjustMode.ADD,
      duration: Duration.FRAMES,
      valueNumber: 1,
      spacing: 1
    },
    {
      ...commandInfos.fullscreen.generate(),
      key: {shiftKey: true, code: "KeyF"},
      direct: true
    },
    {
      ...commandInfos.setMark.generate(),
      key: {shiftKey: true, code: "KeyW"},
      valueString: "mark1"
    },
    {
      ...commandInfos.seekMark.generate(),
      key: "KeyW",
      valueString: "mark1"
    },
    {
      ...commandInfos.loop.generate(),
      key: "KeyR",
      valueString: "mark1",
      spacing: 2
    },
    {
      ...commandInfos.drawPage.generate(),
      trigger: Trigger.CONTEXT,
      contextLabel: "- Draw on Page",
      replaceWithGsm: 4
    },
    {
      ...commandInfos.cinema.generate(),
      trigger: Trigger.CONTEXT,
      contextLabel: "- Darken Background",
      replaceWithGsm: 10
    },
    {
      ...commandInfos.fxFilter.generate(),
      trigger: Trigger.CONTEXT,
      replaceWithGsm: 6,
      contextLabel: "- Fx :: Invert Page",
      filterOption: "invert",
      filterTarget: "both",
      adjustMode: AdjustMode.CYCLE,
      valueCycle: [0, 1]
    },
    {
      ...commandInfos.fxFilter.generate(),
      trigger: Trigger.CONTEXT,
      replaceWithGsm: 7,
      contextLabel: "- Fx :: Grayscale Page",
      filterOption: "grayscale",
      filterTarget: "backdrop",
      adjustMode: AdjustMode.ITC,
      valueItcMin: 0,
      valueItcMax: 1,
    },
    {
      ...commandInfos.fxFilter.generate(),
      trigger: Trigger.CONTEXT,
      replaceWithGsm: 8,
      contextLabel: "- Fx :: Video Brightness",
      filterOption: "brightness",
      adjustMode: AdjustMode.ITC,
      valueItcMin: 0.5,
      valueItcMax: 2,
    },
    {
      ...commandInfos.fxFilter.generate(),
      trigger: Trigger.CONTEXT,
      replaceWithGsm: 9,
      contextLabel: "- Fx :: Video Contrast",
      filterOption: "contrast",
      adjustMode: AdjustMode.ITC,
      valueItcMin: 0.75,
      valueItcMax: 1.25
    },
    {
      ...commandInfos.fxReset.generate(),
      trigger: Trigger.CONTEXT,
      filterTarget: "both",
      contextLabel: "- Fx :: Reset",
      replaceWithGsm: 5
    }
  ]
  if (chrome.tabCapture && chrome.offscreen) {
    kbs.push(
      {
        ...commandInfos.afxPitch.generate(),
        trigger: Trigger.CONTEXT,
        contextLabel: "- pitch",
        adjustMode: AdjustMode.ITC,
        replaceWithGsm: 1
      },
      {
        ...commandInfos.afxGain.generate(),
        trigger: Trigger.CONTEXT,
        contextLabel: "- gain",
        adjustMode: AdjustMode.ITC,
        replaceWithGsm: 2,
      },
      {
        ...commandInfos.afxReset.generate(),
        trigger: Trigger.CONTEXT,
        contextLabel: "- audio reset",
        replaceWithGsm: 3,
        spacing: 2
      }
    )
  }
  return kbs 
}

export const availableCommandNames = Object.entries(commandInfos)
.filter(v => !v[1].requiresTabCapture || (chrome.tabCapture && chrome.offscreen))
.filter(v => !v[1].requiresPiPApi || !isFirefox())
.map(v => v[0])