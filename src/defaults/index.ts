
import { Config } from "../types"
import { getDefaultFilterValues } from "./filters"
import { getDefaultKeyBinds } from "./commands"

export const SPEED_PRESETS = [0.25, 0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 5, 10, 16]

export function getDefaultConfig(): Config {
  return {
    version: 5,
    pins: [],
    common: {
      speed: 1,
      enabled: true,
      elementFilterValues: getDefaultFilterValues(),
      backdropFilterValues: getDefaultFilterValues()
    },
    keybinds: getDefaultKeyBinds()
  }
}

export const standardIcons = {
  "48": `icon48.png`,
  "128": `icon128.png`
}

export const grayscaleIcons = {
  "48": `icon48_grayscale.png`,
  "128": `icon128_grayscale.png`
}