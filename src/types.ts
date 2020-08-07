import { Hotkey } from "./utils/keys"
import { CommandName } from "./defaults/commands"
import { FilterName } from "./defaults/filters"
import { TabInfo } from "./utils/browserUtils"


declare global {
  interface DocumentOrShadowRoot {
    pictureInPictureElement: HTMLVideoElement,
  }
  interface Document {
    exitPictureInPicture: () => void 
  }
  interface HTMLVideoElement {
    requestPictureInPicture(): () => void
  }
  interface HTMLMediaElement {
    gsKey?: string,
    gsMarks?: {
      [key: string]: number
    },
    gsLoopTimeUpdateHandler?: () => void,
    gsLoopSeekingHandler?: () => void
  }
}

export type State = {
  version: number,
  language?: string,
  pinByDefault?: boolean,
  hideIndicator?: boolean,
  feedbackVolume?: number,
  hideBadge?: boolean,
  hideMediaView?: boolean,
  staticOverlay?: boolean,
  darkTheme?: boolean,
  keybinds?: Keybind[],
  ghostMode?: boolean,
  rules?: URLRule[],
  common: Context,
  indicatorInit?: IndicatorInit,
}

export type StateSansCommon = Omit<State, "common">
export type StateView = Partial<StateSansCommon & Context & {isPinned: boolean}>


export type StateViewSelector = {
  [key in keyof StateView]: boolean
}

export type IndicatorInit = {
  backgroundColor?: string,
  textColor?: string,
  scaling?: number,
  rounding?: number,
  duration?: number,
  offset?: number,
  static?: boolean
}

export type MediaPath = {
  key: string,
  tabInfo: TabInfo
}

export type Pin = {tabId: number, ctx: Context}

export type Context = {
  lastSpeed?: number,
  speed: number, 
  enabled: boolean,
  elementFx: Fx,
  backdropFx: Fx,
  audioFx: AudioFx
}

export type AudioFx = {
  pitch: number,
  volume: number,
  mono?: boolean,
  delay: number,
  delayMerge?: boolean,
  eq: {
    name?: string,
    enabled: boolean,
    factor: number,
    values: number[]
  },
  comp: {
    name?: string,
    enabled: boolean,
    threshold: number,
    knee: number,
    ratio: number,
    attack: number,
    release: number,
    gain: number
  }
}

export enum AdjustMode {
  SET = 1,
  ADD,
  CYCLE
}

export type Command = {
  withFilterTarget?: boolean,
  withFilterOption?: boolean,
  valueType?: "number" | "string" | "modalString" | "adjustMode" | "state",
  valueMin?: number,
  valueMax?: number,
  valueStep?: number,
  valueDefault?: number,
  requiresMedia?: boolean,
  requiresTabCapture?: boolean,
  generate: () => Keybind 
}

export type Keybind = {
  id: string,
  command: CommandName,
  enabled: boolean,
  global?: boolean,
  globalKey?: string,
  key?: Hotkey,
  greedy?: boolean,
  ifMedia?: boolean,
  valueNumber?: number,
  valueNumberAlt?: number,
  valueCycle?: number[],
  valueString?: string,
  valueState?: StateOption,
  valueBool?: boolean,
  filterOption?: FilterName,
  filterTarget?: TargetFx,
  adjustMode?: AdjustMode,
  cycleIncrement?: number,
  spacing?: number
}


export type Fx = {
  enabled?: boolean,
  filters: FilterEntry[],
  transforms: FilterEntry[],
  query?: string,
  originX?: string,
  originY?: string
}


export type FilterInfo = {
  isTransform?: boolean,
  min?: number,
  max?: number,
  step: number,
  default: number,
  sliderMin: number,
  sliderMax: number,
  sliderStep?: number,
  format: (value: number) => string 
}

export type TargetFx = "element" | "backdrop" | "both"

export type TargetFxFlags = {
  backdrop?: boolean,
  element?: boolean
}

export type FilterEntry = {name: FilterName, value: number}
export type StateOption = "on" | "off" | "toggle"



export type URLRule = {
  id: string,
  enabled: boolean,
  matchType: "STARTS_WITH" | "CONTAINS" | "REGEX",
  match: string,
  type: "SPEED" | "STATE" | "FX",
  overrideSpeed: number,
  overrideFx?: {
    elementFx: Fx,
    backdropFx: Fx
  },
  overrideEnabled?: boolean,
  strict?: boolean,
  initialLoadOnly?: boolean
}


export type Gsm = {
  audio: {
    captureTab: string,
    releaseTab: string,
    equalizer: string,
    compressor: string
  },
  warnings: {
    backdropFirefox: string,
    unusedGlobal: string,
    selectTooltip: string,
    sliderTooltip: string
  },
  token: {
    create: string,
    reset: string,
    
    on: string,
    off: string,
    toggle: string,
    
    element: string,
    backdrop: string,
    both: string,
    
    query: string,
    warning: string,
    filters: string,
    transforms: string,

    indicator: string,
    color: string,
    size: string,
    rounding: string,
    duration: string,
    offset: string
  },
  filter: {
    grayscale: string,
    sepia: string,
    hueRotate: string,
    contrast: string,
    brightness: string,
    saturate: string,
    invert: string,
    blur: string,
    opacity: string,
    scaleX: string,
    scaleY: string,
    translateX: string,
    translateY: string,
    rotateX: string,
    rotateY: string,
    rotateZ: string
  },
  fxPanel: {
    queryTooltip: string,
    intoPane: string
  },
  command: {
    nothing: string,
    runCode: string,
    adjustSpeed: string,
    setPin: string,
    setState: string,
    seek: string,
    setPause: string,
    setMute: string,
    adjustVolume: string,
    setMark: string,
    seekMark: string,
    toggleLoop: string,
    toggleLoopTooltip: string,
    openUrl: string,
    setFx: string,
    resetFx: string,
    flipFx: string,
    adjustFilter: string,
    adjustPitch: string,
    adjustGain: string,
    adjustDelay: string,
    tabCapture: string
  },
  options: {
    flags: {
      header: string,
      language: string,
      languageTooltip: string,
      darkTheme: string,
      pinByDefault: string,
      pinByDefaultTooltip: string,
      hideIndicator: string,
      hideIndicatorTooltip: string,
      hideBadge: string,
      hideBadgeTooltip: string,
      fullscreenSupport: string,
      feedbackVolume: string,
      ghostMode: string,
      ghostModeTooltip: string,
      hideMediaView: string
    },
    editor: {
      header: string,
      toggleMode: string,
      toggleModeTooltip: string,
      greedyMode: string
    },
    rules: {
      header: string,
      startsWith: string,
      contains: string,
      regex: string,
      LAX: string,
      ILO: string
    },
    help: {
      header: string,
      issuePrompt: string,
      issueDirective: string
    }
  }
}