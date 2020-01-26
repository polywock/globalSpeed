
export type Config = {
  version: number,
  speed: number,
  defaultSpeed: number
  incrementKey: string,
  decrementKey: string,
  resetKey: string,
  pins: Pin[]
}

export type Pin = {tabId: number, speed: number}