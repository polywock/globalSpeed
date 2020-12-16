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
    gsLoopSeekingHandler?: () => void,
    preservesPitch?: boolean
    mozPreservesPitch?: boolean
    webkitPreservesPitch?: boolean
    videoTracks: any[]
    audioTracks: any[]
  }
}

// New entries must be added to namedSelectors.simple @ src/background/GlobalState.ts 
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
  keybindsUrlCondition?: URLCondition,
  ghostMode?: boolean,
  rules?: URLRule[],
  common: Context,
  indicatorInit?: IndicatorInit,
  freePitch?: boolean,
  superDisable?: boolean,
  firstUse?: number,
  clickedRating?: number,
  speedPresets?: number[],
  speedSmallStep?: number,
  speedBigStep?: number,
  speedSlider?: {min: number, max: number},
  showNetSeek?: boolean
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

// New entries must be added to namedSelectors.ctx @ src/background/GlobalState.ts 
export type Context = {
  lastSpeed?: number,
  speed: number, 
  enabled: boolean,
  elementFx: Fx,
  backdropFx: Fx,
  monoOutput?: boolean,
  audioFx: AudioFx,
  audioFxAlt?: AudioFx,
  audioPan?: number 
}

export type AudioFx = {
  pitch: number,
  jungleMode?: boolean, 
  volume: number,
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
  group?: CommandGroup
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

export enum CommandGroup {
  FX = 1,
  AUDIO_FX,
  MEDIA,
  MISC
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
  spacing?: number,
  condition?: URLCondition
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
  condition: URLCondition,
  type: "SPEED" | "STATE" | "FX" | "JS",
  overrideSpeed: number,
  overrideFx?: {
    elementFx: Fx,
    backdropFx: Fx
  },
  overrideEnabled?: boolean,
  overrideJs?: string,
  strict?: boolean,
  initialLoadOnly?: boolean
}


export type URLConditionPart = {
  type: "STARTS_WITH" | "CONTAINS" | "REGEX",
  inverse?: boolean,
  value: string,
  disabled?: boolean,
  id: string
}

export type URLCondition = {
  parts: URLConditionPart[],
  matchAll?: boolean
}


export type Gsm = {
  audio: {
    captureTab: string,
    releaseTab: string,
    equalizer: string,
    compressor: string,
    split: string,
    mono: string,
    reverse: string,
    pan: string
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
    offset: string,
    
    any: string,
    all: string,
    copy: string,
    paste: string 
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
    preservePitch: string,
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
    tabCapture: string,
    relativeTooltip: string,
    showNetTooltip: string
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
      greedyMode: string,
      speedPresets: string
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
      issueDirective: string,
      export: string,
      import: string,
      areYouSure: string
    }
  }
}