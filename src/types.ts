
export type Config = {
  version: number,
  speed: number,
  defaultSpeed: number
  incrementKey: string,
  decrementKey: string,
  stepValue: number,
  resetKey: string,
  pinKey: string,
  pins: Pin[],
  pinByDefault: boolean,
  hotkeys:  "enabled" | "ifVideo" | "disabled"
}

export type Pin = {tabId: number, speed: number}