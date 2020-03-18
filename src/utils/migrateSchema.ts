import { persistConfig, getConfig } from "./configUtils"
import { getDefaultConfig } from "../defaults"

export async function migrateSchema() {
  const currentConfig = await getConfig()
  const newConfig = getDefaultConfig()
  
  if (currentConfig == null || currentConfig.version == null || currentConfig.version <= 3) {
    persistConfig(newConfig)
    return 
  }

  if (currentConfig.version === 4) {
    currentConfig.keybinds = ((currentConfig.keybinds || []) as any[]).filter(v => v.command !== "adjustGain") 
    currentConfig.version = 5
    persistConfig(currentConfig)
    return 
  }
}
