
import { HAS_PIP_API, SUPPORTS_BACKDROP } from "src/utils/supports"
import { Command, Keybind, AdjustMode, CommandGroup } from "../types"
import { randomId, groupByKey, flatJoin } from "../utils/helper"

export type CommandName = "nothing" | "runCode" | "adjustSpeed" | "speedChangesPitch" | "setPin" | "setState" | 
  "seek" | "setPause" | "setMute" | "adjustVolume" | "setMark" | "seekMark" | "toggleLoop" | "openUrl" | 
  "setFx" | "resetFx" | "flipFx" | "adjustFilter" |
  "adjustGain" | "adjustPitch" | "adjustDelay" | "tabCapture" | "fullscreen" | "PiP"


export let commandInfos: {[key in CommandName]: Command} = {
  nothing: {
    group: CommandGroup.MISC,
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
      valueString: "https://www.google.com/"
    })
  },
  adjustSpeed: {
    valueType: "adjustMode",
    hasFeedback: true,
    valueMin: 0.07,
    valueMax: 16,
    valueStep: 0.1,
    valueDefault: 1,
    generate: () => ({
      id: randomId(),
      command: "adjustSpeed",
      enabled: true,
      greedy: true,
      adjustMode: AdjustMode.SET
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
  setPin: {
    valueType: "state",
    hasFeedback: true,
    generate: () => ({
      id: randomId(),
      command: "setPin",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  setState: {
    valueType: "state",
    hasFeedback: true,
    generate: () => ({
      id: randomId(),
      command: "setState",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  seek: {
    group: CommandGroup.MEDIA,
    valueType: "number",
    requiresMedia: true,
    noNull: true,
    hasFeedback: true,
    generate: () => ({
      id: randomId(),
      command: "seek",
      enabled: true,
      greedy: true,
      valueNumber: 10
    })
  },
  setPause: {
    group: CommandGroup.MEDIA,
    valueType: "state",
    requiresMedia: true,
    hasFeedback: true,
    generate: () => ({
      id: randomId(),
      command: "setPause",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  setMute: {
    group: CommandGroup.MEDIA,
    hasFeedback: true,
    valueType: "state",
    requiresMedia: true,
    generate: () => ({
      id: randomId(),
      command: "setMute",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  adjustVolume: {
    group: CommandGroup.MEDIA,
    hasFeedback: true,
    valueType: "number",
    requiresMedia: true,
    valueDefault: 0.05,
    generate: () => ({
      id: randomId(),
      command: "adjustVolume",
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
  toggleLoop: {
    group: CommandGroup.MEDIA,
    hasFeedback: true,
    valueType: "string",
    requiresMedia: true,
    generate: () => ({
      id: randomId(),
      command: "toggleLoop",
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
  setFx: {
    group: CommandGroup.FX,
    hasFeedback: true,
    withFilterTarget: true,
    valueType: "state",
    generate: () => ({
      id: randomId(),
      command: "setFx",
      enabled: true,
      greedy: true,
      valueState: "toggle",
      filterTarget: "element"
    })
  },
  resetFx: {
    group: CommandGroup.FX,
    hasFeedback: true,
    withFilterTarget: true,
    generate: () => ({
      id: randomId(),
      command: "resetFx",
      enabled: true,
      greedy: true,
      filterTarget: "element"
    })
  },
  flipFx: {
    group: CommandGroup.FX,
    hasFeedback: true,
    generate: () => ({
      id: randomId(),
      command: "flipFx",
      enabled: true,
      greedy: true
    })
  },
  adjustFilter: {
    group: CommandGroup.FX,
    hasFeedback: true,
    valueType: "adjustMode",
    withFilterOption: true,
    withFilterTarget: true,
    generate: () => ({
      id: randomId(),
      command: "adjustFilter",
      filterOption: "hueRotate",
      enabled: true,
      greedy: true,
      filterTarget: "element",
      adjustMode: AdjustMode.ADD
    })
  },
  adjustGain: {
    group: CommandGroup.AUDIO_FX,
    hasFeedback: true,
    valueType: "adjustMode",
    requiresTabCapture: true,
    valueMin: 0,
    valueMax: 16,
    valueStep: 0.05,
    valueDefault: 1,
    generate: () => ({
      id: randomId(),
      command: "adjustGain",
      enabled: true,
      greedy: true,
      adjustMode: AdjustMode.ADD
    })
  },
  adjustPitch: {
    group: CommandGroup.AUDIO_FX,
    hasFeedback: true,
    valueType: "adjustMode",
    requiresTabCapture: true,
    valueMin: -36,
    valueMax: 36,
    valueStep: 1,
    valueDefault: 0,
    generate: () => ({
      id: randomId(),
      command: "adjustPitch",
      enabled: true,
      greedy: true,
      adjustMode: AdjustMode.ADD
    })
  },
  adjustDelay: {
    group: CommandGroup.AUDIO_FX,
    hasFeedback: true,
    valueType: "adjustMode",
    requiresTabCapture: true,
    valueMin: 0,
    valueMax: 60,
    valueStep: 0.05,
    valueDefault: 0,
    generate: () => ({
      id: randomId(),
      command: "adjustDelay",
      enabled: true,
      greedy: true,
      adjustMode: AdjustMode.ADD
    })
  },
  tabCapture: {
    group: CommandGroup.AUDIO_FX,
    hasFeedback: true,
    valueType: "state",
    requiresTabCapture: true,
    generate: () => ({
      id: randomId(),
      command: "tabCapture",
      enabled: true,
      greedy: true,
      valueState: "toggle",
      global: true
    })
  },
}


export function getDefaultKeybinds(): Keybind[] {
  let kbs: Keybind[] = [
    {
      ...commandInfos.adjustSpeed.generate(),
      key: "KeyA",
      adjustMode: AdjustMode.ADD,
      valueNumberAlt: -0.1
    },
    {
      ...commandInfos.adjustSpeed.generate(),
      key: "KeyS",
      valueNumber: 1,
      adjustMode: AdjustMode.SET
    },
    {
      ...commandInfos.adjustSpeed.generate(),
      key: "KeyD",
      adjustMode: AdjustMode.ADD,
      valueNumberAlt: 0.1,
      spacing: 1
    },
    {
      ...commandInfos.setPin.generate(),
      key: "KeyQ"
    },
    {
      ...commandInfos.setState.generate(),
      key: {code: "KeyQ", shiftKey: true},
      spacing: 2
    },
    {
      ...commandInfos.seek.generate(),
      key: "KeyZ",
      enabled: true,
      valueNumber: -5,
      valueBool2: true
    },
    {
      ...commandInfos.seek.generate(),
      key: "KeyX",
      enabled: true,
      valueNumber: 10,
      valueBool2: true,
      spacing: 1
    },
    {
      ...commandInfos.seek.generate(),
      key: {shiftKey: true, code: "KeyZ"},
      enabled: true,
      valueNumber: -0.041
    },
    {
      ...commandInfos.seek.generate(),
      key: {shiftKey: true, code: "KeyX"},
      enabled: true,
      valueNumber: 0.041,
      spacing: 1
    },
    {
      ...commandInfos.fullscreen.generate(),
      key: {shiftKey: true, code: "KeyF"},
      enabled: true,
      valueBool: true,
      spacing: 2
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
      ...commandInfos.toggleLoop.generate(),
      key: "KeyR",
      valueString: "mark1",
      spacing: 2,
      enabled: false
    }
  ]
  if (SUPPORTS_BACKDROP) {
    kbs.push({
      ...commandInfos.adjustFilter.generate(),
      key: {code: "KeyE"},
      filterOption: "invert",
      filterTarget: "both",
      adjustMode: AdjustMode.CYCLE,
      enabled: false,
      valueCycle: [0, 1]
    },
    {
      ...commandInfos.adjustFilter.generate(),
      key: {code: "KeyE", shiftKey: true},
      filterOption: "grayscale",
      filterTarget: "backdrop",
      adjustMode: AdjustMode.CYCLE,
      enabled: false,
      valueCycle: [0, 1],
      spacing: 2
    })
  }
  return kbs 
}


export const availableCommandNames = flatJoin(
  groupByKey(
    Object.entries(commandInfos)
      .filter(v => !v[1].requiresTabCapture || chrome.tabCapture)
      .filter(v => !v[1].requiresPiPApi || HAS_PIP_API)
      .map(([name, info]) => [name, info.group] as [string, CommandGroup]),
    v => v[1]
  )
    .map(g => g.map(v => v[0])),
  null
)