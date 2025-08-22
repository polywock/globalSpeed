import { Hotkey } from "./utils/keys"
import { CommandName } from "./defaults/commands"
import { FilterName } from "./defaults/filters"
import { TabInfo } from "./utils/browserUtils"

declare global {
  interface GlobalVar {
  }

  var gvar: GlobalVar

  interface Message {
  }

  type Messages = Message[keyof Message]

  interface AudioWorkletMessage {
  }

  type AudioWorkletMessages = AudioWorkletMessage[keyof AudioWorkletMessage]

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
    gsSkipTimeUpdateHandler?: () => void,
    gsSkipSeekingHandler?: () => void,
    gsShadowRoot?: ShadowRoot,
    gsRateCounter?: {time: number, count: number},
    gsRateViolations?: number,
    gsRateBanned?: boolean,
    gsFpsSum?: number,
    gsFpsCount?: number,
    gsLastPlayed?: number,
    mozPreservesPitch?: boolean,
    webkitPreservesPitch?: boolean,
    videoTracks: any[],
    audioTracks: any[],
    seekToNextFrame?: () => Promise<any>
  }
}

export type AnyDict = {[key: string]: any}

export type State = {
  version: number,
  qrCodeHide?: boolean,
  qrCodeSeenCounter?: number, 
  speedChangeCounter?: number,
  language?: string,
  fontSize?: number,
  pinByDefault?: boolean,
  initialContext?: InitialContext,
  customContext?: Context,
  hideIndicator?: boolean,
  hideBadge?: boolean,
  hideMediaView?: boolean,
  darkTheme?: boolean,
  keybinds?: Keybind[],
  keybindsUrlCondition?: URLCondition,
  websitesAddedToUrlConditionsExclusion?: string[] 
  ghostMode?: boolean,
  ghostModeUrlCondition?: URLCondition,
  rules?: URLRule[],
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
  ignorePiP?: boolean, // PiP videos are deprioritized for hotkeys.
  minimizeOrlBanner?: boolean,
  hideOrlBanner?: boolean,
  virtualInput?: boolean,
  hideGrant?: boolean,
  circleWidget?: boolean,
  circleInit?: CircleInit,
  freshKeybinds?: boolean,
  holdToSpeed?: number
} & Context

export type StoredKey = `${"t" | "r"}:${number}:${keyof Context | "isPinned"}` | `${"g" | "x"}:${keyof State}`; 

export type StateView = Partial<State & {isPinned: boolean, hasOrl: boolean}>


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
  static?: boolean,
  position?: "TL" | "TR" | "BL" | "BR" | "C",
  animation?: 1 | 2 | 3 | 4 | 5,
  showShadow?: boolean,
  key?: string 
}

export type CircleInit = {
  circleSize?: number,
  circleInitial?: Point,
  autoHideDisabled?: boolean,
  opacity?: number,
  fullscreenOnly?: boolean,
  mainAction?: "PAUSE" | "SPEED",
  mainActionSpeed?: number,
  fixedSpeedStep?: number,
  fixedSeekStep?: number,
  key?: string
}

export enum InitialContext {
  PREVIOUS = 1,
  GLOBAL,
  NEW,
  CUSTOM
}


export type Pin = {tabId: number, ctx: Context}

export type Context = {
  speed: number, 
  lastSpeed?: number,
  enabled: boolean,
  latestViaShortcut?: boolean,
  elementFx?: Fx,
  backdropFx?: Fx,
  monoOutput?: boolean,
  audioFx: AudioFx,
  audioFxAlt?: AudioFx,
  audioPan?: number
}

export const CONTEXT_KEYS: (keyof Context)[] = [ 
  "speed", "lastSpeed", "enabled", "latestViaShortcut", "elementFx", "backdropFx", 
  "monoOutput", "audioFx", "audioFxAlt", "audioPan"
]

export const CONTEXT_KEYS_SET = new Set(CONTEXT_KEYS)

// Groups of context keys that are tightly coupled and should be cleared together (URL Overrides). 
export const ORL_GROUPS: (keyof Context)[][] = [["speed"], ["elementFx", "backdropFx"], ["enabled", "latestViaShortcut"]]

export const ORL_CONTEXT_KEYS: (keyof Context)[] = ORL_GROUPS.flat(1)

export const ORL_CONTEXT_KEYS_SET = new Set(ORL_CONTEXT_KEYS)

export const REVERSE_ORL_GROUP = Object.fromEntries(ORL_CONTEXT_KEYS.map(k => [k, ORL_GROUPS.find(o => o.includes(k))])) as {[key in keyof Context]: (keyof Context)[]}

export const AUDIO_CONTEXT_KEYS = ["enabled", "monoOutput", "audioFx", "audioFxAlt", "audioPan"] as (keyof Context)[]
export const AUDIO_CONTEXT_KEYS_SET = new Set(AUDIO_CONTEXT_KEYS)

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
  }
}

export enum AdjustMode {
  SET = 1,
  ADD,
  CYCLE,
  ITC,
  ITC_REL
}

export enum Duration {
  SECS = 1,
  FRAMES,
  PERCENT
}

export enum Trigger {
  LOCAL = 0,
  GLOBAL = 1,
  CONTEXT = 2
}

export type Command = {
  group?: CommandGroup
  withDuration?: boolean,
  withFilterTarget?: boolean,
  withFilterOption?: boolean,
  ffName?: string,
  valueType?: "number" | "string" | "modalString" | "adjustMode" | "state",
  hasFeedback?: boolean,
  requiresMedia?: boolean,
  requiresVideo?: boolean,
  requiresTabCapture?: boolean,
  requiresPiPApi?: boolean,
  noReset?: boolean,
  ref?: ReferenceValues,
  getRef?: (command: Command, kb: Keybind) => ReferenceValues
  generate: () => Keybind 
}

export type ReferenceValues = {
  min?: number,
  max?: number,
  step?: number,
  default?: number,
  reset?: number,
  sliderMin?: number,
  sliderMax?: number,
  sliderStep?: number,
  itcStep?: number,
  wrappable?: boolean
}

export enum CommandGroup {
  FX = 1,
  AUDIO_FX,
  MEDIA,
  MISC
}


export type Keybind = {
  id: string,
  label?: string,
  command: CommandName,
  enabled: boolean,
  
  trigger?: Trigger,
  allowAlt?: boolean,
  cycleNoWrap?: boolean,
  replaceWithGsm?: number,

  key?: Hotkey,
  keyAlt?: Hotkey,
  globalKey?: string,
  globalKeyAlt?: string,
  contextLabel?: string
  contextLabelAlt?: string

  greedy?: boolean,
  ifMedia?: boolean,
  valueNumber?: number,
  valueNumberAlt?: number,
  valueItcMin?: number,
  valueItcMax?: number,
  valueCycle?: number[],
  valueString?: string,
  valueState?: StateOption,
  valueUrlMode?: "fgTab" | "bgTab" | "newWindow" | "newPopup" | "sameTab",
  valuePopupRect?: Rect,
  invertIndicator?: boolean,
  
  relativeToSpeed?: boolean,
  fastSeek?: boolean,
  showNetDuration?: number
  wraparound?: boolean,
  itcWraparound?: boolean,
  autoPause?: boolean, 
  skipPauseSmall?: boolean,
  pauseWhileScrubbing?: boolean, 
  seekOnce?: boolean,
  noHold?: boolean,
  skipToggleSpeed?: boolean,
  direct?: boolean,
  ignoreNavigate?: boolean,
  filterOption?: FilterName,
  filterTarget?: TargetFx,
  adjustMode?: AdjustMode,
  duration?: Duration,
  cycleIncrement?: number,
  spacing?: number,
  condition?: URLCondition,
  oncePerUp?: boolean,
  alwaysOn?: boolean
}

export type KeybindMatch = {
  kb: Keybind;
  alt?: boolean;
}

export type KeybindMatchId = {
  id: string, 
  alt?: boolean;
}



export type Rect = {
  left: number,
  top: number,
  width: number,
  height: number 
}

export type Point = {
  x: number,
  y: number 
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
  ref?: ReferenceValues,
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
  label?: string,
  spacing?: number,
  condition?: URLCondition,
  type: "SPEED" | "ON" | "OFF" | "FX" | "JS",
  overrideSpeed: number,
  overrideFx?: {
    elementFx: Fx,
    backdropFx: Fx
  },
  overrideJs?: string,
  strictness?: URLStrictness,
  titleRestrict?: string 
}

export enum URLStrictness {
  FIRST_TIME = 1,
  DIFFERENT_HOST,
  EVERY_COMMIT,
  EVERY_NAVIGATION
}


export type URLConditionPart = {
  type: "STARTS_WITH" | "CONTAINS" | "REGEX",
  valueStartsWith: string,
  valueContains: string,
  valueRegex: string,
  disabled?: boolean,
  id: string
}

export type URLCondition = {
  parts: URLConditionPart[],
  block?: boolean
}



export type MediaProbe = {
  currentTime: number,
  duration: number,
  paused: boolean,
  volume: number,
  fps: number,
  formatted?: string,
  fullyLooped?: boolean
}

export type ItcInit = {
  mediaKey?: string,
  dontReleaseKeyUp?: boolean,
  mediaTabInfo?: TabInfo,
  mediaDuration?: number,
  shouldShow?: boolean,
  kb: Keybind,

  relative?: boolean
  seekOnce?: boolean,
  resetTo?: number
  original?: number,
  originalAlt?: number,

  step?: number,
  min?: number,
  max?: number,

  sliderMin?: number,
  sliderMax?: number,

  wasPaused?: boolean
}

