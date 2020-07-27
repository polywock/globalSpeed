import { StateView, Keybind, State, AdjustMode } from "../types"
import { getDefaultState } from "../defaults"
import { commandInfos } from "../defaults/commands";
import { filterInfos } from "../defaults/filters";

export function migrateGrainData(state: State) {
  if (state.version < 5) {
    return getDefaultState()
  } else if (state.version === 6 || state.version === 5) {
    const newState = getDefaultState()
    // newState.keybinds = state.keybinds || [];
    newState.hideBadge = state.hideBadge
    newState.hideIndicator = state.hideIndicator
    newState.language = state.language
    newState.pinByDefault = state.pinByDefault
    newState.version = 7
    newState.keybinds = [];

    const noUpdate = ["adjustFilter", "setFilter", "cycleFilterValue"]

    for (let kb of (state.keybinds as any[]))  {
      if (kb.command === "adjustSpeed") {
        newState.keybinds.push({command: "adjustSpeed", key: kb.key, enabled: kb.enabled, greedy: kb.greedy, id: kb.id, valueNumberAlt: kb.valueNumber, adjustMode: AdjustMode.ADD})
        continue
      }

      if (kb.command === "setSpeed") {
        newState.keybinds.push({command: "adjustSpeed", key: kb.key, enabled: kb.enabled, greedy: kb.greedy, id: kb.id, valueNumber: kb.valueNumber, adjustMode: AdjustMode.SET})
        continue 
      }

      if (noUpdate.includes(kb.command)) continue 

      newState.keybinds.push(kb)
    }

    newState.keybinds = newState.keybinds.filter(kb => {
      const info = commandInfos[kb.command]
      if (!info) return
      if (info.withFilterOption && !filterInfos[kb.filterOption]) return 
      return true 
    })
    return newState 
  }
  return state 
}



