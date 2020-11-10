
import { Command, Keybind, AdjustMode } from "../types"
import { randomId } from "../utils/helper"

export type CommandName = "nothing" | "runCode" | "adjustSpeed" | "preservePitch" | "setPin" | "setState" | 
  "seek" | "setPause" | "setMute" | "adjustVolume" | "setMark" | "seekMark" | "toggleLoop" | "openUrl" | 
  "setFx" | "resetFx" | "flipFx" | "adjustFilter" |
  "adjustGain" | "adjustPitch" | "adjustDelay" | "tabCapture"


export let commandInfos: {[key in CommandName]: Command} = {
  nothing: {
    generate: () => ({
      id: randomId(),
      command: "nothing",
      enabled: true,
      greedy: true
    })
  },
  runCode: {
    valueType: "modalString",
    generate: () => ({
      id: randomId(),
      command: "runCode",
      enabled: true,
      greedy: true,
      valueString: `// your code here\n\nspeechSynthesis.speak(new SpeechSynthesisUtterance("Global Speed"))`
    })
  },
  openUrl: {
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
    valueMin: 0.0625,
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
  preservePitch: {
    valueType: "state",
    requiresMedia: true,
    generate: () => ({
      id: randomId(),
      command: "preservePitch",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  setPin: {
    valueType: "state",
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
    generate: () => ({
      id: randomId(),
      command: "setState",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  seek: {
    valueType: "number",
    requiresMedia: true,
    generate: () => ({
      id: randomId(),
      command: "seek",
      enabled: true,
      greedy: true,
      valueNumber: 5
    })
  },
  setPause: {
    valueType: "state",
    requiresMedia: true,
    generate: () => ({
      id: randomId(),
      command: "setPause",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  setMute: {
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
  setFx: {
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
    generate: () => ({
      id: randomId(),
      command: "flipFx",
      enabled: true,
      greedy: true
    })
  },
  adjustFilter: {
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
    valueType: "state",
    requiresTabCapture: true,
    generate: () => ({
      id: randomId(),
      command: "tabCapture",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
}


export function getDefaultKeybinds(): Keybind[] {
  return [
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
      valueNumber: -5
    },
    {
      ...commandInfos.seek.generate(),
      key: "KeyX",
      enabled: true,
      valueNumber: 5,
      spacing: 1
    },
    {
      ...commandInfos.seek.generate(),
      key: {shiftKey: true, code: "KeyZ"},
      enabled: true,
      valueNumber: -0.04
    },
    {
      ...commandInfos.seek.generate(),
      key: {shiftKey: true, code: "KeyX"},
      enabled: true,
      valueNumber: 0.04,
      spacing: 1
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
    },
    {
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
    }
  ]
}


export const availCommandInfos = Object.fromEntries(Object.entries(commandInfos).filter(([k, v]) => !v.requiresTabCapture || chrome.tabCapture))