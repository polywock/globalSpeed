import { persistConfig, getConfig } from "./configUtils"
import { getDefaultConfig } from "../defaults"

export async function migrateSchema() {
  const currentConfig = await getConfig()
  const newConfig = getDefaultConfig()
  
  if (currentConfig == null || currentConfig.version == null || currentConfig.version <= 4) {
    persistConfig(newConfig)
    return 
  }

  // some users have been accidently clicking the toggle invert key, need to reset em.
  if (currentConfig.version === 5) {
    currentConfig.version = 6
    currentConfig.common.backdropFx = false
    currentConfig.common.elementFx = false 
    persistConfig(currentConfig)
    return 
  }
}
