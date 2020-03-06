import { Hotkey } from "./utils/keys"
import { CommandName } from "./defaults/commands"
import { FilterName } from "./defaults/filters"


export type Config = {
  version: number,
  common: Context,
  pins: Pin[],
  pinByDefault?: boolean,
  hideIndicator?: boolean,
  hideBadge?: boolean,
  keybinds: KeyBind[],
  usePolling?: boolean,
  pollRate?: number,
  shadowPollRate?: number 
}

export type Context = {
  speed: number, 
  enabled: boolean,
  elementFx?: boolean,
  backdropFx?: boolean,
  elementFilterValues: FilterValue[],
  backdropFilterValues: FilterValue[],
  elementQuery?: string,
  elementFlipX?: boolean
  elementFlipY?: boolean
  backdropFlipX?: boolean
}

export type Pin = {tabId: number, ctx: Context}


export type Command = {
  name: string,
  shortName?: string,
  tooltip?: string,
  withFilterTarget?: boolean,
  withFilterOption?: boolean,
  valueType?: "number" | "string" | "modalString" | "filterNumber" | "cycle" | "state",
  valueMin?: number,
  valueMax?: number,
  generate: () => KeyBind 
}

export type KeyBind = {
  id: string,
  command: CommandName,
  enabled: boolean,
  key?: Hotkey,
  greedy?: boolean,
  ifMedia?: boolean,
  valueNumber?: number,
  valueCycle?: number[],
  valueString?: string,
  valueState?: SetState
  filterOption?: FilterName,
  filterTarget?: FilterTarget,
  cycleIncrement?: number,
  spacing?: number
}

export type FilterTarget = "element" | "backdrop" | "both" | "enabled"

export type FilterInfo = {
  name: string,
  min?: number,
  max?: number,
  smallStep: number,
  largeStep: number,
  default: number,
  format: (value: number) => string 
}

export type FilterValue = {filter: FilterName, value: number}



export type SetState = "on" | "off" | "toggle"