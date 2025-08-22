
import { Fx, AudioFx, URLRule, IndicatorInit, URLCondition, URLConditionPart, Context, CONTEXT_KEYS, AnyDict, State } from "../types"
import { FilterName, filterInfos } from "./filters"
import { getDefaultKeybinds } from "./commands"
import { chunkByPredicate, isMobile, randomId } from "../utils/helper"

export type WebsiteInfo = {
  v: string,
  contains?: boolean
}

export const SHORTCUT_DISABLED_WEBSITES: WebsiteInfo[] = [
  {v: "https://docs.google.com"},
  {v: "https://play.geforcenow.com"},
  {v: "https://www.xbox.com"},
  {v: "https://docs.qq.com"},
  {v: "https://www.playstation.com"},
  {v: "https://excalidraw.com"},
  {v: "https://www.photopea.com"},
  {v: "https://www.canva.com"},
  {v: "http://luna.amazon.com"},
  {v: "https://ys.mihoyo.com"},
  {v: "https://www.youtube.com/playables"},
  {v: "game", contains: true}
]


export function turnWebsiteInfoIntoString(info: WebsiteInfo) {
  if (info.contains) return `contains_${info.v}`
  return `starts_${info.v}`
}

export function generateUrlPart(origin: string): URLConditionPart {
    return {
      id: randomId(),
      type: 'STARTS_WITH',
      valueStartsWith: origin,
      valueContains: origin,
      valueRegex: ''
    }
}

export function getDefaultState(): State {
  let state = {
    version: 12,
    firstUse: Date.now(),
    keybinds: getDefaultKeybinds(),
    freshKeybinds: true,
    ...getDefaultContext(),
    keybindsUrlCondition: getDefaultKeybindsUrlConditions(),
    websitesAddedToUrlConditionsExclusion: SHORTCUT_DISABLED_WEBSITES.map(w => turnWebsiteInfoIntoString(w)),
    hideMediaView: isMobile(),
    holdToSpeed: isMobile() ? 2 : undefined
  } as State;

  return state 
}

export function getDefaultKeybindsUrlConditions() {
  return {
    block: true,
    parts: SHORTCUT_DISABLED_WEBSITES.map(origin => {
      const part = generateUrlPart(origin.v)
      if (origin.contains) part.type = "CONTAINS"
      return part 
    })
  }
}

export function getEmptyUrlConditions(block: boolean) {
  return {
    block,
    parts: []
  } as URLCondition
}

export function getDefaultContext(withNulls?: boolean): Context {
  const obj: AnyDict = {
    speed: 1,
    enabled: true,
    audioFx: getDefaultAudioFx()
  }
  withNulls && CONTEXT_KEYS.forEach(key=> {
    obj[key] = obj[key] ?? null
  })
  return obj as Context
}


export function getDefaultFx(): Fx  {
  const [passed, failed] = chunkByPredicate(Object.entries(filterInfos), ([k, v]) => v.isTransform)
  return {
    filters: failed.map(([k, v]) => ({name: k as FilterName, value: v.ref.default})),
    transforms: passed.map(([k, v]) => ({name: k as FilterName, value: v.ref.default}))
  }
}


export function getDefaultAudioFx(): AudioFx {
  return {
    pitch: 0,
    volume: 1,
    delay: 0,
    eq: getDefaultEq()
  }
}


export function getDefaultEq(): AudioFx["eq"] {
  return {
    enabled: false,
    factor: 1,
    values: Array(10).fill(0)
  }
}

const EQ_10_PRESETS: readonly {name: string, values: number[]}[] = Object.freeze([
  {name: "1965", values: [-6, -17.2, -6, 0, -3.6, 9.2, 1.2, 9.2, 3.6, -5.2]},
  {name: "1965 - Part 2", values: [-18, -14.4, 0, 0, -3.6, 9.2, 1.2, 9.2, 3.6, -5.2]},
  {name: "Lo-Fidelity", values: [-15.1, -9.4, 0, 2.3, -2, 4.3, 4.3, -2.3, -4.6, -8.9]},
  {name: "Musical Presence", values: [0, 0, 0, 0, 0, 2.5, 5, 2.5, 0, 0]},
  {name: "Notch Every Two Octaves", values: [-18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99]},
  {name: "Rattle The Trunk", values: [17.99, 17.99, 9, 0, 0, 0, 0, 0, 0, 0]},
  {name: "Simple Bass Cut", values: [-4, -3, -2, -2, -2, 0, 0, 0, 0, 0]},
  {name: "Simple Bass Lift", values: [6, 6, 3, 3, 3, 0, 0, 0, 0, 0]},
  {name: "Simple High Cut", values: [0, 0, 0, 0, 0, -2, -2, -3, -3, -3]},
  {name: "Simple High Lift", values: [0, 0, 0, 0, 0, 1, 2, 2, 3, 4]},
  {name: "Vocal Presence - Boost", values: [0, 0, 0, 0, 0, 0, 6.5, 0, 0, 0]},
  {name: "Vocal Presence - Cut", values: [0, 0, 0, 0, 0, 0, -6.5, 0, 0, 0]}
])

const EQ_20_PRESETS: readonly {name: string, values: number[]}[] = Object.freeze([
  {name: "20 Band Classic V", values: [5, 6, 3.54, 0.59, -0.48, -2.5, -5, -7, -8, -8, -7, -5, -3, -2.5, -1, 2, 3, 4, 5, 4.02]},
  {name: "Bowed String", values: [0, 0, -1.2, -1.6, -2.4, -2.8, -1.6, -1.6, -1.6, 0, 0, 0, 0, 0, 2.4, 3.6, 5.6, 0, 0, 0]},
  {name: "Bright and Punchy", values: [-3, 3, 6, 4.5, 3, 1.5, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 4, 4, 4]},
  {name: "Cymbal Shimmer", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -0.1, -0.3, -0.5, -0.4, 0.2, 1.3, 2.6, 3.6, 4]},
  {name: "Dark and Dull", values: [-6, -4, -2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -3, -6, -9, -12, -15, -18, -18]},
  {name: "Destination - Car Stereo", values: [-4, -2, 0, 3, 4, 3, 1.5, 0, -1, -2, -2, -1, 0, 1, 2, 3, 4, 2, 0, -3]},
  {name: "Heavy Guitar", values: [0, -0.2, -0.1, 1, 1.9, 1.6, 0.4, -0.5, -1.1, -2.2, -3.6, -3.9, -2.9, -1.6, -0.5, 0.1, 0.1, 0, 0, 0]},
  {name: "Liven up dead samples", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.1, -0.2, -0.6, 0.5, 3, 3.9, 1.5, -0.4]},
  {name: "Notch Every Octave", values: [-18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99]},
  {name: "Possible Bass", values: [0, 0, 5.2, 6, 3.2, 0, -11.6, -5.2, -4, -4, 0, 3.2, 4.8, 0, 0, 0, -3.2, -7.2, -10.8, -14]},
  {name: "Sloping High End Boost", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 6, 7, 8, 8]},
  {name: "Sloping Low End Boost", values: [8, 8, 8, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
  {name: "Tinny and Brittle", values: [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 0, 0, 0, 1, 3.52, 6, 6, 3, 1]},
  {name: "Vocal Magic (breath)", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1, -0.1, -0.5, 2, 2.5, 1]}
])

const EQ_30_PRESETS: readonly {name: string, values: number[]}[] = Object.freeze([
  {name: "Bass - Increased Clarity", values: [-4, -3.4, -1.9, -0.3, 0.6, 0.6, 0.2, -0.3, -1.2, -1.5, 1.4, 2.9, 0.7, 0.2, 0.8, 0.5, 0, -2, -0.5, -0.5, -0.4, -0.2, 0, 0, -0.2, -0.4, -0.4, -0.3, -0.1, 0]},
  {name: "Background Vocal", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -0.2, -0.3, -0.4, -0.4, -3, -6, -3, 0, 0, -0.1, 0, 0, 0]},
  {name: "Classic V", values: [3, 2.5, 1.3, 0.2, -0.4, -0.5, -0.2, 0.2, 0.4, 0.3, -0.3, -1.6, -3.4, -5.7, -8.2, -10.2, -10.9, -9.8, -7.4, -4.5, -2.3, -0.9, -0.1, 0, -0.2, -0.3, 0.2, 1.3, 2.5, 3]},
  {name: "Destination - Home Theater", values: [4.5, 6, 7.5, 7.5, 5, 3, 1.5, 0.5, 0, -0.5, -1.5, -3, -5, -3, -1.5, 0, 1.5, 3, 3, 3, 1.5, 0, 0, 3, 6, 7.5, 7.5, 6, 3, 0]},
  {name: "Drums", values: [0, 0, 0, 0, 0, 0, 0, -0.1, 0.3, 0.4, -2, -2.8, 0, 0.6, -0.2, -0.1, 0, -0.2, -0.3, -0.5, -0.4, -0.1, 0, 0, 0.2, -0.3, -0.1, 2.5, 2.1, 0]},
  {name: "Generic Attack Booster", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -0.1, -0.1, -0.1, 0.2, 0.6, 1.3, 2, 2.8, 3.1, 2.7, 1.8, 0.6, -0.2, -0.3, -0.1, 0]},
  {name: "Generic Mud Removal", values: [0, 0, 0, 0, -0.1, -0.3, -0.7, -1.5, -2.4, -3, -2.8, -2, -0.8, 0, 0.4, 0.3, 0, -0.1, -0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
  {name: "Gentle Hi Boost", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 1.5, 3, 5, 5, 3, 1.5, 0.5]},
  {name: "Gentle Hi Cut", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -0.5, -1.5, -3, -5, -5, -3, -1.5, -0.5]},
  {name: "Gentle Low Boost", values: [0, 0.5, 1.5, 3, 5, 3, 1.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
  {name: "Gentle Low Cut", values: [0, -0.5, -1.5, -3, -5, -3, -1.5, -0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
  {name: "Gentle Mid Boost", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 1.5, 3, 5, 5, 3, 1.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
  {name: "Gentle Mid Cut", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -0.5, -1.5, -3, -5, -5, -3, -1.5, -0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
  {name: "Guitar - Increases Attack", values: [0, 0, 0, 0, -1.5, -4, -2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -0.2, -0.3, -0.4, 2, 0, -0.1, 0, 0, 0, -0.1, 0, 0, 0]},
  {name: "Keyboards - Bright and Clear", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -0.2, -0.3, -0.4, -0.4, 2, 5, 2.5, 0, 0, -0.1, 0, 0, 0]},
  {name: "Kick - Less Boxy, more Attack", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -2.5, -6, -2.5, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 2, 0, 0, 0, 0, 0, 0]},
  {name: "Lead Vocal - Clarity", values: [0, 0, 0, 0, 0, 0, 0, 0, -3, 0, 0, 0, 0, 0, 0, 0, 0, -0.2, -0.3, -0.4, -0.4, 0, 2, 0, 0, 4, -0.1, 0, 0, 0]},
  {name: "Notch Every 2/3 Octave", values: [-18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99, -18, 17.99]},
  {name: "RIAA De-Emphasis", values: [18.3, 17.6, 16.7, 15.6, 14.2, 12.8, 11.3, 9.6, 8, 6.5, 5, 3.7, 2.6, 1.6, 0.7, 0, -0.7, -1.6, -2.6, -3.7, -5.1, -6.6, -8.2, -10, -11.9, -13.8, -15.7, -17.7, -19.7, -20]},
  {name: "Snare - Increase Snap", values: [0, -0.1, -0.2, -0.1, 0.5, 1.3, 1.9, 1.9, 1.3, 0.4, -0.1, -0.3, -0.2, 0, 0.1, 0, 0, -0.1, -0.2, -0.4, -0.6, -0.7, -0.5, 1.5, 2, 0, 0, 0, 0.9, 0]},
  {name: "cymbals sans gong", values: [-8, -6.5, -3.3, -0.4, 0.4, -0.5, -2.3, -3.7, -4.5, -4.4, -3.7, -2.3, -0.9, 0.1, 0.5, 0.3, 0, -0.3, -0.5, -0.5, -0.4, -0.2, 0, 0.1, 0, 0, -0.1, 0, 0, 0]}
])

export const EQ_PRESETS = {
  "10": EQ_10_PRESETS,
  "20": EQ_20_PRESETS,
  "30": EQ_30_PRESETS
}

export function getDefaultURLConditionPart(): URLConditionPart {
  return {
    type: "CONTAINS",
    valueContains: "example.com",
    valueStartsWith: String.raw`https://example.com`,
    valueRegex: String.raw`example\.com`,
    id: randomId()
  }
}

export function getDefaultURLCondition(block?: boolean): URLCondition {
  return {
    parts: [],
    block
  }
}

export function getDefaultURLRule(): URLRule {
  return {
    id: randomId(),
    enabled: true,
    type: "SPEED",
    overrideSpeed: 1,
    overrideJs: `// code here\n`
  }
}


export const INDICATOR_INIT: IndicatorInit = {
  backgroundColor: "#000000",
  textColor: "#ffffff",
  scaling: 1,
  rounding: 0,
  duration: 1,
  offset: 1
}