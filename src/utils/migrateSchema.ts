import { persistConfig } from "./configUtils"
import { getDefaultConfig } from "../defaults"
import { getStorage } from "./browserUtils"

export async function migrateSchema() {
  let currentStorage = await getStorage()
  let currentConfig = (currentStorage.config || {}) as any
  const newConfig = getDefaultConfig()
  
  if (currentStorage.speed && !currentConfig) {
    newConfig.common.speed = currentStorage.speed 
    persistConfig(newConfig)
  }

  if (currentConfig.version === 1 || currentConfig.version === 2) {
    if (currentConfig.decrementKey) {
      newConfig.keybinds[0].key = currentConfig.decrementKey
    } if (currentConfig.resetKey) {
      newConfig.keybinds[1].key = currentConfig.resetKey
    } if (currentConfig.incrementKey) {
      newConfig.keybinds[2].key = currentConfig.incrementKey
    } if (currentConfig.pinKey) {
      newConfig.keybinds[3].key = currentConfig.pinKey
    } if (currentConfig.speed) {
      newConfig.common.speed = currentConfig.speed
    } if (currentConfig.pinByDefault) {
      newConfig.pinByDefault = currentConfig.pinByDefault
    }
    persistConfig(newConfig)
    return 
  }

  if (currentConfig.version === 3) {
    currentConfig.version = 4
    currentConfig.keybinds = (currentConfig.keybinds as any[]).filter(v => v.command !== "setRecursive") 
    delete currentConfig.common.recursive
    delete currentConfig.fxPanal 
    persistConfig(currentConfig)
    return 
  }
}
