import { createContext } from "react"
import { Config, Pin, Context } from "./types"


export type ConfigContextType = {
  config?: Config,
  tabId?: number,
  pin?: Pin,
  ctx?: Context
}

export const ConfigContext = createContext<ConfigContextType>({})