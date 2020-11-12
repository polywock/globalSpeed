import { State } from "../types"
import { getDefaultState } from "../defaults"
import { randomId } from "./helper"

export function migrateSchema(state: State) {
  const defaultState = getDefaultState()

  if (!state || state.version < 7) {
    return defaultState
  } 
  
  if (state.version === 7) {
    state = sevenToEight(state)  
  }

  /* if (state.version === 8) {
    state = eightToNine(state)
  } */

  if (!(state?.version === defaultState.version)) {
    return defaultState
  }

  return state 
}

// These migration functions should be self contained. 
function sevenToEight(state: State) {
  state.version = 8 
  state.rules?.forEach(rule => {
    rule.condition = {
      parts: [{type: (rule as any).matchType || "CONTAINS", id: randomId(), value: (rule as any).match || ""}]
    }
    delete (rule as any).matchType
    delete (rule as any).match
  })
  return state 
}

/* function eightToNine(state: State) {
  state.version = 9
  return state 
} */