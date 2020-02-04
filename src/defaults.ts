
import { Config } from "./types"

export function getDefaultConfig(): Config {
  return {
    version: 2,
    speed: 1,
    defaultSpeed: 1,
    decrementKey: "KeyA",
    incrementKey: "KeyD",
    stepValue: 0.1,
    resetKey: "KeyS",
    pinKey: "KeyQ",
    pins: [],
    pinByDefault: false,
    hotkeys: "enabled"
  }
}

export const SPEED_PRESETS = [0.25, 0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 5, 10, 16]