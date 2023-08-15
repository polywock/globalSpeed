import { Hotkey } from "./utils/keys"
import { CommandName } from "./defaults/commands"
import { FilterName } from "./defaults/filters"
import { TabInfo } from "./utils/browserUtils"


declare global {
  interface GlobalVar {
  }
  
  var gvar: GlobalVar
  interface Event {
    processed?: boolean
  }
  interface HTMLVideoElement {
    intersectionRatio: number 
  }
  interface HTMLMediaElement {
    gsKey?: string,
    gsFrameSpan?: number,
    gsMarks?: {
      [key: string]: number
    },
    gsNameless?: number[],
    gsLoopTimeUpdateHandler?: () => void,
    gsLoopSeekingHandler?: () => void,
    gsRateCounter?: {time: number, count: number},
    gsRateViolations?: number,
    gsRateBanned?: boolean,
    mozPreservesPitch?: boolean,
    webkitPreservesPitch?: boolean,
    videoTracks: any[],
    audioTracks: any[],
    seekToNextFrame?: () => Promise<any>
  }
}

export type State = {
  version: number,
  language?: string,
  pinByDefault?: boolean,
  inheritPreviousContext?: boolean,
  hideIndicator?: boolean,
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
  speedPresetRows?: number,
  speedPresetPadding?: number,
  speedSmallStep?: number,
  speedBigStep?: number,
  speedSlider?: {min: number, max: number},
  showNetSeek?: boolean,
  ignorePiP?: boolean // PiP videos are deprioritized for hotkeys.
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
  speed: number, 
  lastSpeed?: number,
  enabled: boolean,
  enabledLatestViaPopup?: boolean,
  elementFx: Fx,
  backdropFx: Fx,
  monoOutput?: boolean,
  audioFx: AudioFx,
  audioFxAlt?: AudioFx,
  audioPan?: number
}

export const CONTEXT_KEYS: (keyof Context)[] = [ 
  "speed", "lastSpeed", "enabled", "enabledLatestViaPopup", "elementFx", "backdropFx", 
  "monoOutput", "audioFx", "audioFxAlt", "audioPan"
]

export type AudioFx = {
  pitch: number,
  jungleMode?: boolean, 
  volume: number,
  delay: number,
  delayMerge?: boolean,
  pan: number,
  eq: {
    name?: string,
    enabled: boolean,
    factor: number,
    values: number[]
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
  hasFeedback?: boolean,
  valueDefault?: number,
  requiresMedia?: boolean,
  requiresVideo?: boolean,
  requiresTabCapture?: boolean,
  requiresPiPApi?: boolean,
  noNull?: boolean,
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
  hideIndicator?: boolean,
  valueNumberAlt?: number,
  valueCycle?: number[],
  valueString?: string,
  valueState?: StateOption,
  valueBool?: boolean,
  valueBool2?: boolean,
  valueBool3?: boolean,
  valueBool4?: boolean,
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
    split: string,
    mono: string,
    reverse: string,
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
    hide: string,
    
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

    blockEvents: string,
    hideIndicator: string,
    indicator: string,
    color: string,
    size: string,
    rounding: string,
    duration: string,
    offset: string,
    rows: string,
    
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
    speedChangesPitch: string,
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
    fullscreen: string,
    nativeTooltip: string,
    PiP: string,
    openUrl: string,
    setFx: string,
    resetFx: string,
    flipFx: string,
    adjustFilter: string,
    adjustPitch: string,
    adjustGain: string,
    adjustPan: string,
    adjustDelay: string,
    tabCapture: string,
    relativeTooltip: string,
    fastSeekTooltip: string,
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
      hideBadge: string,
      hideBadgeTooltip: string,
      fullscreenSupport: string,
      ghostMode: string,
      ghostModeTooltip: string,
      hideMediaView: string,
      inheritGlobal?: string,
      inheritGlobalTooltip?: string
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
      conditions: string,
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

// Compound utility type that makes certain keys in an interface option. 
// export type PartialPick<T, K extends keyof T & (string | number | symbol)> =  Omit<T, K> & Partial<Pick<T, K>>