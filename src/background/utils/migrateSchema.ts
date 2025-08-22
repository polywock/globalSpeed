import { AdjustMode, Context, Duration, Keybind, State, Trigger, URLCondition, URLConditionPart, URLRule } from "../../types"
import { generateUrlPart, getDefaultState, getEmptyUrlConditions, SHORTCUT_DISABLED_WEBSITES, turnWebsiteInfoIntoString } from "../../defaults"
import { isFirefox, randomId } from "../../utils/helper"
import { availableCommandNames } from "src/defaults/commands"

export function migrateSchema(state?: State) {
  const initialVersion = state?.version
  const defaultState = getDefaultState()

  if (!state || state.version < 7) {
    return defaultState
  } 
  
  if (state.version === 7) {
    state = sevenToEight(state)  
  }

  if (state.version === 8) {
    state = eightToNine(state)
  }

  if (state.version === 9) {
    state = nineToTen(state)
  }

  if (state.version === 10) {
    state = tenToEleven(state)
  }

  if (state.version === 11) {
    state = elevenToTwelve(state, initialVersion)
  }

  if (!(state?.version === defaultState.version)) {
    return defaultState
  }

  if (isFirefox()) {
    state = migrateForFirefox(state)
  } else {
    state = migrateForChrome(state)
  }

  state = migrateShortcutsDisabledList(state) || state 
  return state 
}

function migrateShortcutsDisabledList(state: State) {
  state.websitesAddedToUrlConditionsExclusion = state.websitesAddedToUrlConditionsExclusion || []
  const excludedSet = new Set(state.websitesAddedToUrlConditionsExclusion) 
  state.keybindsUrlCondition = state.keybindsUrlCondition || getEmptyUrlConditions(true)
  const cond = state.keybindsUrlCondition
  cond.parts = cond.parts || []
  if (!cond.block) return

  SHORTCUT_DISABLED_WEBSITES.forEach(website => {
    const key = turnWebsiteInfoIntoString(website)
    if (excludedSet.has(key)) return 

    // Check if they already have it (User added) 
    if (website.contains) {
        if (cond.parts.find(p => p.valueContains === website.v && p.type === "CONTAINS")) return 
    } else {
      if (cond.parts.find(p => p.valueStartsWith === website.v && p.type === "STARTS_WITH")) return 
    }

    state.websitesAddedToUrlConditionsExclusion.push(key)
    const part = generateUrlPart(website.v)
    if (website.contains) part.type = "CONTAINS"
    cond.parts.push(part)
  })
  return state 
}

// These migration functions should be self contained. 
function sevenToEight(state: any) {
  state.version = 8 
  state.rules?.forEach((rule: any) => {
    rule.condition = {
      parts: [{type: rule.matchType || "CONTAINS", id: randomId(), value: rule.match || ""}]
    }
    delete rule.matchType
    delete rule.match
  })
  return state 
}

function eightToNine(state: any) {
  state.version = 9
  state.keybinds?.forEach((kb: any) => {
    if (kb.command === "seek") {
      kb.valueBool2 = true
    }
  })
  return state 
}

function nineToTen(state: any) {
  state.version = 10
  state.keybinds?.forEach((kb: any) => {
    if (kb.command === "preservePitch") {
      kb.command = "speedChangesPitch"
      kb.valueState = kb.valueState === "on" ? "off" : kb.valueState === "off" ? "on" : "toggle"
    }
  })
  return state 
}



function tenToEleven(state: State) {
  const renameMap: {[key: string]: any} = {
    adjustSpeed: "speed",
    setPin: "pin",
    setState: "state",
    setPause: "pause",
    setMute: "mute",
    adjustVolume: "volume",
    toggleLoop: "loop",
    setFx: "fxState",
    resetFx: "fxReset",
    flipFx: "fxSwap",
    adjustFilter: "fxFilter",
    adjustGain: "afxGain",
    adjustPitch: "afxPitch",
    adjustDelay: "afxDelay",
    adjustPan: "afxPan",
    tabCapture: "afxCapture"
  }

  const migrateURLCondition = (c: URLCondition, rule?: URLRule, kb?: Keybind) => {
    if (rule && !isFirefox()) c.parts = rule.type === "JS" ? c.parts.filter((p: any) => p.type !== "REGEX") : c.parts

    c.parts.forEach((p: URLConditionPart) => {
      p.valueContains = p.type === "CONTAINS" ? (p as any).value : String.raw`example.com`
      p.valueStartsWith = p.type === "STARTS_WITH" ? (p as any).value : String.raw`https://example.com`
      p.valueRegex = p.type === "REGEX" ? (p as any).value : String.raw`example\.com`
      delete (p as any).value
    })

    if ((c as any).matchAll && c.parts.every((p: any) => p.inverse)) {
      (c as URLCondition).block = true 
    } else if (!(c as any).matchAll && c.parts.every((p: any) => !p.inverse)) {
      // do nothing 
    } else {
      // Frankenstein rules should be disabled until further user action.
      if (rule) {
        rule.enabled = false
      } else {
        c.parts = []
      }
    }
    
    // clear depreciated keys 
    c.parts.forEach((p: any) => {
      delete p.inverse
    })
    delete (c as any).matchAll
  }


  state.version = 11
  state.rules?.forEach(rule => {
    if ((rule as any).type === "STATE") {
      rule.type = (rule as any).overrideEnabled ? "ON" : "OFF"
    } 


    if ((rule as any).condition)  migrateURLCondition((rule as any).condition, rule)
    
    delete (rule as any).overrideEnabled
    delete (rule as any).strict
    delete (rule as any).initialLoadOnly
  })
  ;((state as any).common as Context).latestViaShortcut = !(state as any).common.enabledLatestViaPopup
  delete (state as any).common.enabledLatestViaPopup

  state.keybinds = state.keybinds ?? []
  
  // Rename 
  state.keybinds.forEach(kb => {
    if (Object.hasOwn(renameMap, kb.command)) {
      kb.command = renameMap[kb.command]
    }
  })

  if (state.keybindsUrlCondition) migrateURLCondition(state.keybindsUrlCondition)
  
  // Migrate keybinds 
  state.keybinds.forEach(kb => {

    if ((kb as any).global) {
      kb.trigger = Trigger.GLOBAL
    }

    if (kb.condition) {
      if (kb.condition.parts?.length) {
        migrateURLCondition(kb.condition)
      } else {
        delete kb.condition
      }
    }

    if (kb.adjustMode === AdjustMode.ADD) {
      kb.valueNumber = kb.valueNumberAlt
    }

    // Migrate seek
    if (kb.command === "seek") {
      if ((kb as any).valueBool) kb.relativeToSpeed = true
      if ((kb as any).valueBool2) kb.fastSeek = true
      if ((kb as any).valueBool3) kb.autoPause = true

      kb.adjustMode = AdjustMode.ADD

      if ((kb as any).valueBool4) {
        kb.adjustMode = AdjustMode.SET
        kb.duration = Duration.PERCENT
        kb.valueNumber = (kb as any).valueNumberAlt
      } else if (Math.abs(kb.valueNumber) < 0.05) {
        kb.duration = Duration.FRAMES
        kb.valueNumber = kb.valueNumber < 0 ? -1 : 1 
      }

      delete (kb as any).valueBool, delete (kb as any).valueBool2, delete (kb as any).valueBool3, delete (kb as any).valueBool4
    } 

    // Migrate volume 
    if (kb.command === "volume") {
      kb.adjustMode = AdjustMode.ADD
    }
    
    // Migrate seekMark
    else if (kb.command === "seekMark") {
      if ((kb as any).valueBool2) kb.fastSeek = true
      delete (kb as any).valueBool2
    }
    // Migrate fullscreen
    else if (kb.command === "fullscreen") {
      if ((kb as any).valueBool) kb.direct = true
      delete (kb as any).valueBool
    }

    delete (kb as any).valueNumberAlt
  })

  state.initialContext = (state as any).inheritPreviousContext ? 1 : 2
  delete (state as any).staticOverlay

  const common = (state as any).common as Context
  delete (state as any).common
  Object.assign(state, common)
  
  return state 
}


function elevenToTwelve(state: State, initialVersion?: number) {
  state.version = 12 
  if (initialVersion === 11) {
    // Restore incorrectly ported 
    let hasDefaultIncrease = state.keybinds.some(kb => kb.command === "speed" && kb.key === "KeyD" && kb.valueNumber === 0.1 && kb.adjustMode === AdjustMode.ADD)
    if (hasDefaultIncrease) {
      let kb = state.keybinds.find(kb => kb.command === "speed" && kb.adjustMode === AdjustMode.ADD && kb.key === "KeyA" && kb.valueNumber == null)
      if (kb) {
        kb.valueNumber = -0.1 
      }
    }

    // Restore nothing
    state.keybinds.filter(kb => kb.command === "speed" && kb.valueNumber === 0 && kb.adjustMode === AdjustMode.ADD).forEach(kb => {
      kb.command = "nothing"
    }) 
  }
  return state 
}

function migrateForChrome(state: State) {
  

  return state
}

function migrateForFirefox(state: State) {
  state.keybinds = state.keybinds.filter(kb => availableCommandNames.includes(kb.command))

  return state
}