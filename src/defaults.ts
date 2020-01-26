
import { Config } from "./types"

export function getDefaultConfig(): Config {
  return {
    version: 1,
    speed: 1,
    defaultSpeed: 1,
    decrementKey: "KeyA",
    resetKey: "KeyS",
    incrementKey: "KeyD",
    pins: []
  }
}

export const SPEED_PRESETS = [0.25, 0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 5, 10, 16]