
import { Command, KeyBind } from "../types"
import { uuidLowerAlpha } from "../utils/helper"

export type CommandName = "nothing" | "runCode" | "adjustSpeed" | "setSpeed" | "setPin" | "setState" | 
  "seek" | "setPause" | "setMute" | "setMark" | "seekMark" | "toggleLoop" | "openUrl" | 
  "setFx" | "resetFx" | "flipFx" | "adjustFilter" | "setFilter" | "cycleFilterValue"

export const commandInfos: {
  [key in CommandName]: Command
} = {
  nothing: {
    name: chrome.i18n.getMessage("commandInfo__nothingName"),
    tooltip: chrome.i18n.getMessage("commandInfo__nothingTooltip"),
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "nothing",
      enabled: true,
      greedy: true
    })
  },
  runCode: {
    name: chrome.i18n.getMessage("commandInfo__runCodeName"),
    tooltip: chrome.i18n.getMessage("commandInfo__runCodeTooltip"),
    valueType: "modalString",
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "runCode",
      enabled: true,
      greedy: true,
      valueString: `speechSynthesis.speak(new SpeechSynthesisUtterance("Global Speed is awesome."))`
    })
  },
  adjustSpeed: {
    name: chrome.i18n.getMessage("commandInfo__adjustSpeedName"),
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
    name: chrome.i18n.getMessage("commandInfo__setSpeedName"),
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
    name: chrome.i18n.getMessage("commandInfo__setPinName"),
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
    name: chrome.i18n.getMessage("commandInfo__setStateName"),
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
    name: chrome.i18n.getMessage("commandInfo__seekName"),
    tooltip: chrome.i18n.getMessage("commandInfo__seekTooltip"),
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
    name: chrome.i18n.getMessage("commandInfo__setPauseName"),
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
    name: chrome.i18n.getMessage("commandInfo__setMuteName"),
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
    name: chrome.i18n.getMessage("commandInfo__setMarkName"),
    tooltip: chrome.i18n.getMessage("commandInfo__setMarkTooltip"),
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
    name: chrome.i18n.getMessage("commandInfo__seekMarkName"),
    tooltip: chrome.i18n.getMessage("commandInfo__seekMarkTooltip"),
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
    name: chrome.i18n.getMessage("commandInfo__toggleLoopName"),
    tooltip: chrome.i18n.getMessage("commandInfo__toggleLoopTooltip"),
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
    name: chrome.i18n.getMessage("commandInfo__openUrlName"),
    tooltip: chrome.i18n.getMessage("commandInfo__openUrlTooltip"),
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
    name: chrome.i18n.getMessage("commandInfo__setFxName"),
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
    name: chrome.i18n.getMessage("commandInfo__resetFxName"),
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
    name: chrome.i18n.getMessage("commandInfo__flipFxName"),
    generate: () => ({
      id: uuidLowerAlpha(16),
      command: "flipFx",
      enabled: true,
      greedy: true
    })
  },
  adjustFilter: {
    name: chrome.i18n.getMessage("commandInfo__adjustFilterName"),
    shortName: chrome.i18n.getMessage("commandInfo__adjustFilterShortName"),
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
    name: chrome.i18n.getMessage("commandInfo__setFilterName"),
    shortName: chrome.i18n.getMessage("commandInfo__setFilterShortName"),
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
    name: chrome.i18n.getMessage("commandInfo__cycleFilterValueName"),
    shortName: chrome.i18n.getMessage("commandInfo__cycleFilterValueShortName"),
    tooltip: chrome.i18n.getMessage("commandInfo__cycleFilterValueTooltip"),
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
      filterTarget: "element",
      valueCycle: [0, 1]
    }
  ]
}
