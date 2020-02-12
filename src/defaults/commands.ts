
import { Command, KeyBind } from "../types"
import { uuidLowerAlpha } from "../utils/helper"
import { filterInfos } from "./filters"


export type CommandName = "nothing" | "adjustSpeed" | "setSpeed" | "setPin" | "setRecursive" | "setState" | 
  "seek" | "setPause" | "setMute" | "setMark" | "seekMark" | "openUrl" | 
  "setFx" | "resetFx" | "flipFx" | "adjustFilter" | "setFilter" | "cycleFilterValue"

export const commandInfos: {
  [key in CommandName]: Command
} = {
  nothing: {
    name: "do nothing",
    tooltip: "No nothing, can come in handy in combination with greedy enabled to block certain keys.",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "nothing",
      enabled: true
    })
  },
  adjustSpeed: {
    name: "adjust speed",
    tooltip: "Adjust speed by adding a positive or negative value.",
    valueType: "number",
    valueMin: -5,
    valueMax: 5,
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "adjustSpeed",
      enabled: true,
      valueNumber: 0.1
    })
  },
  setSpeed: {
    name: "set speed",
    tooltip: "Set the speed to the provided value.",
    valueType: "number",
    valueMin: 0.07,
    valueMax: 16,
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setSpeed",
      enabled: true,
      valueNumber: 1
    })
  },
  setPin: {
    name: "set pin",
    valueType: "state",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setPin",
      enabled: true,
      valueState: "toggle"
    })
  },
  setRecursive: {
    name: "set recursion",
    valueType: "state",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setRecursive",
      enabled: true,
      valueState: "toggle"
    })
  },
  setState: {
    name: "set state",
    valueType: "state",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setState",
      enabled: true,
      valueState: "toggle"
    })
  },
  seek: {
    name: "seek",
    tooltip: "Adjust current video/audio time by adding a positive or negative value in seconds.",
    valueType: "number",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "seek",
      enabled: true,
      valueNumber: 5
    })
  },
  setPause: {
    name: "set pause",
    valueType: "state",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setPause",
      enabled: true,
      valueState: "toggle"
    })
  },
  setMute: {
    name: "set mute",
    valueType: "state",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setMute",
      enabled: true,
      valueState: "toggle"
    })
  },
  setMark: {
    name: "set mark",
    tooltip: "Mark the current video/audio location for future reference. You can have multiple keybinds to set different marks.",
    valueType: "string",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setMark",
      enabled: true,
      valueString: "mark1"
    })
  },
  seekMark: {
    name: "seek mark",
    tooltip: "Go to a marked video/audio location. If no mark exists, it will create a mark.",
    valueType: "string",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "seekMark",
      enabled: true,
      valueString: "mark1"
    })
  },
  openUrl: {
    name: "open url",
    tooltip: "Open a URL in a new tab.",
    valueType: "string",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "openUrl",
      enabled: true,
      valueString: "https://www.google.com/"
    })
  },
  setFx: {
    name: "set fx state",
    withFilterTarget: true,
    valueType: "state",
    tooltip: "enable or disable fx.",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setFx",
      enabled: true,
      filterTarget: "backdrop",
      valueState: "toggle"
    })
  },
  resetFx: {
    name: "reset fx",
    withFilterTarget: true,
    tooltip: "reset fx values to default",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "resetFx",
      enabled: true,
      filterTarget: "backdrop"
    })
  },
  flipFx: {
    name: "flip fx",
    tooltip: "swap values of element fx and backdrop fx.",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "flipFx",
      enabled: true
    })
  },
  adjustFilter: {
    name: "adjust filter",
    shortName: "adjust",
    valueType: "filterNumber",
    withFilterOption: true,
    withFilterTarget: true,
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "adjustFilter",
      filterOption: "hue-rotate",
      filterTarget: "enabled",
      enabled: true
    })
  },
  setFilter: {
    name: "set filter",
    shortName: "set",
    valueType: "filterNumber",
    withFilterOption: true,
    withFilterTarget: true,
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "setFilter",
      filterOption: "hue-rotate",
      filterTarget: "enabled",
      enabled: true
    })
  },
  cycleFilterValue: {
    name: "cycle filter value",
    shortName: "cycle",
    tooltip: "cycle between provided values. Can be used to toggle invert, grayscale, sepia, etc.",
    withFilterTarget: true,
    withFilterOption: true,
    valueType: "cycle",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "cycleFilterValue",
      filterOption: "invert",
      filterTarget: "enabled",
      valueCycle: [0, 1],
      enabled: true
    })
  }
}


export function getDefaultKeyBinds(): KeyBind[] {
  return [
    {
      ...commandInfos.adjustSpeed.generate(),
      key: "KeyA",
      valueNumber: -0.1,
      greedy: true
    },
    {
      ...commandInfos.setSpeed.generate(),
      key: "KeyS",
      greedy: true
    },
    {
      ...commandInfos.adjustSpeed.generate(),
      key: "KeyD",
      valueNumber: 0.1,
      greedy: true
    },
    {
      ...commandInfos.setPin.generate(),
      key: "KeyQ",
      greedy: true
    },
    {
      ...commandInfos.seek.generate(),
      key: "KeyZ",
      enabled: true,
      valueNumber: -5,
      greedy: true
    },
    {
      ...commandInfos.seek.generate(),
      key: "KeyX",
      enabled: true,
      valueNumber: 5,
      greedy: true
    },
    {
      ...commandInfos.setMark.generate(),
      key: {shiftKey: true, code: "KeyW"},
      enabled: true,
      greedy: true,
      valueString: "mark1"
    },
    {
      ...commandInfos.seekMark.generate(),
      key: "KeyW",
      enabled: true,
      greedy: true,
      valueString: "mark1"
    },
    {
      ...commandInfos.cycleFilterValue.generate(),
      key: {code: "KeyE"},
      enabled: true,
      greedy: true,
      filterOption: "invert",
      filterTarget: "both",
      valueCycle: [0, 1]
    },
    {
      ...commandInfos.cycleFilterValue.generate(),
      key: {shiftKey: true, code: "KeyE"},
      enabled: true,
      greedy: true,
      filterOption: "grayscale",
      filterTarget: "element",
      valueCycle: [0, 1]
    }
  ]
}
