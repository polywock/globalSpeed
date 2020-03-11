
import { Command, KeyBind } from "../types"
import { uuidLowerAlpha } from "../utils/helper"

export type CommandName = "nothing" | "runCode" | "adjustSpeed" | "setSpeed" | "setPin" | "setState" | 
  "seek" | "setPause" | "setMute" | "setMark" | "seekMark" | "toggleLoop" | "openUrl" | 
  "setFx" | "resetFx" | "flipFx" | "adjustFilter" | "setFilter" | "cycleFilterValue"


export let commandInfos: {[key in CommandName]: Command} = {
  nothing: {
    name: "command_nothing",
    tooltip: "command_nothingTooltip",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "nothing",
      enabled: true,
      greedy: true
    })
  },
  runCode: {
    name: "command_runCode",
    valueType: "modalString",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "runCode",
      enabled: true,
      greedy: true,
      valueString: `// your code here\n\nspeechSynthesis.speak(new SpeechSynthesisUtterance("Global Speed"))`
    })
  },
  adjustSpeed: {
    name: "command_adjustSpeed",
    valueType: "number",
    valueMin: -5,
    valueMax: 5,
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "adjustSpeed",
      enabled: true,
      greedy: true,
      valueNumber: 0.1
    })
  },
  setSpeed: {
    name: "command_setSpeed",
    valueType: "number",
    valueMin: 0.07,
    valueMax: 16,
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setSpeed",
      enabled: true,
      greedy: true,
      valueNumber: 1
    })
  },
  setPin: {
    name: "command_pinTab",
    valueType: "state",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setPin",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  setState: {
    name: "command_setState",
    valueType: "state",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setState",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  seek: {
    name: "command_seek",
    tooltip: "command_seekTooltip",
    valueType: "number",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "seek",
      enabled: true,
      greedy: true,
      valueNumber: 5
    })
  },
  setPause: {
    name: "token_pause",
    valueType: "state",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setPause",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  setMute: {
    name: "token_mute",
    valueType: "state",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setMute",
      enabled: true,
      greedy: true,
      valueState: "toggle"
    })
  },
  setMark: {
    name: "command_setMark",
    tooltip: "command_setMarkTooltip",
    valueType: "string",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setMark",
      enabled: true,
      greedy: true,
      valueString: "mark1"
    })
  },
  seekMark: {
    name: "command_seekMark",
    tooltip: "command_seekMarkTooltip",
    valueType: "string",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "seekMark",
      enabled: true,
      greedy: true,
      valueString: "mark1"
    })
  },
  toggleLoop: {
    name: "command_toggleLoop",
    tooltip: "command_toggleLoopTooltip",
    valueType: "string",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "toggleLoop",
      enabled: true,
      greedy: true,
      valueString: "mark1, mark2"
    })
  },
  openUrl: {
    name: "command_openUrl",
    valueType: "string",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "openUrl",
      enabled: true,
      greedy: true,
      valueString: "https://www.google.com/"
    })
  },
  setFx: {
    name: "command_setFx",
    withFilterTarget: true,
    valueType: "state",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setFx",
      enabled: true,
      greedy: true,
      filterTarget: "backdrop",
      valueState: "toggle"
    })
  },
  resetFx: {
    name: "command_resetFx",
    withFilterTarget: true,
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "resetFx",
      enabled: true,
      greedy: true,
      filterTarget: "backdrop"
    })
  },
  flipFx: {
    name: "command_flipFx",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "flipFx",
      enabled: true,
      greedy: true
    })
  },
  adjustFilter: {
    name: "command_adjustFilter",
    valueType: "filterNumber",
    withFilterOption: true,
    withFilterTarget: true,
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "adjustFilter",
      filterOption: "hue-rotate",
      filterTarget: "enabled",
      enabled: true,
      greedy: true
    })
  },
  setFilter: {
    name: "command_setFilter",
    valueType: "filterNumber",
    withFilterOption: true,
    withFilterTarget: true,
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setFilter",
      filterOption: "hue-rotate",
      filterTarget: "enabled",
      enabled: true,
      greedy: true
    })
  },
  cycleFilterValue: {
    name: "command_cycleFilterValue",
    tooltip: "command_cycleFilterValueTooltip",
    withFilterTarget: true,
    withFilterOption: true,
    valueType: "cycle",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "cycleFilterValue",
      filterOption: "invert",
      filterTarget: "enabled",
      valueCycle: [0, 1],
      enabled: true,
      greedy: true
    })
  }
}


export function getDefaultKeyBinds(): KeyBind[] {
  return [
    {
      ...commandInfos.adjustSpeed.generate(),
      key: "KeyA",
      valueNumber: -0.1
    },
    {
      ...commandInfos.setSpeed.generate(),
      key: "KeyS"
    },
    {
      ...commandInfos.adjustSpeed.generate(),
      key: "KeyD",
      valueNumber: 0.1,
      spacing: 1
    },
    {
      ...commandInfos.setPin.generate(),
      key: "KeyQ",
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
      key: {code: "KeyZ", shiftKey: true},
      enabled: true,
      valueNumber: -0.04
    },
    {
      ...commandInfos.seek.generate(),
      key: {code: "KeyX", shiftKey: true},
      enabled: true,
      valueNumber: 0.04,
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
      valueString: "mark1",
      spacing: 1
    },
    {
      ...commandInfos.toggleLoop.generate(),
      key: "KeyR",
      valueString: "mark1",
      spacing: 2
    },
    {
      ...commandInfos.cycleFilterValue.generate(),
      key: {code: "KeyE"},
      filterOption: "invert",
      filterTarget: "both",
      valueCycle: [0, 1]
    },
    {
      ...commandInfos.cycleFilterValue.generate(),
      key: {shiftKey: true, code: "KeyE"},
      filterOption: "grayscale",
      filterTarget: "backdrop",
      valueCycle: [0, 1]
    }
  ]
}
