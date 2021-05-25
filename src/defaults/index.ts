
import { Fx, AudioFx, URLRule, State, IndicatorInit, URLCondition, URLConditionPart } from "../types"
import { FilterName, filterInfos } from "./filters"
import { getDefaultKeybinds } from "./commands"
import { chunkByPredicate, randomId } from "../utils/helper"

export function getDefaultState(): State {
  return {
    version: 10,
    firstUse: new Date().getTime(),
    keybinds: getDefaultKeybinds(),
    common: {
      speed: 1,
      enabled: true,
      backdropFx: getDefaultFx(),
      elementFx: getDefaultFx(),
      audioFx: getDefaultAudioFx()
    },
    speedSlider: getDefaultSpeedSlider()
  }
}

export function getDefaultFx(): Fx  {
  const [passed, failed] = chunkByPredicate(Object.entries(filterInfos), ([k, v]) => v.isTransform)
  return {
    filters: failed.map(([k, v]) => ({name: k as FilterName, value: v.default})),
    transforms: passed.map(([k, v]) => ({name: k as FilterName, value: v.default}))
  }
}


export function getDefaultAudioFx(): AudioFx {
  return {
    pitch: 0,
    volume: 1,
    delay: 0,
    eq: getDefaultEq(),
    comp: getDefaultComp()
  }
}

export function getDefaultComp(): AudioFx["comp"] {
  return {
    enabled: false,
    threshold: -24,
    knee: 30,
    ratio: 12,
    attack: 0.003,
    release: 0.25,
    gain: 1
  }
}

export function getDefaultEq(): AudioFx["eq"] {
  return {
    enabled: false,
    factor: 1,
    values: Array(10).fill(0)
  }
}


// Presets from Audio Audition.
export const COMP_PRESETS: readonly AudioFx["comp"][] = Object.freeze([
  {
    name: "Blissful Bass",
    enabled: true,
    threshold: -12.9,
    gain: Math.sqrt(Math.pow(Math.E, 3 / 10)),
    ratio: 4.6,
    attack: 13.4 / 1000,
    release: 200 / 1000,
    knee: 30
  },
  {
    name: "Brickwall Limiter",
    enabled: true,
    threshold: -10,
    gain: Math.sqrt(Math.pow(Math.E, 10 / 10)),
    ratio: 20,
    attack: 3.3 / 1000,
    release: 24 / 1000,
    knee: 30
  },
  {
    name: "Generous Allowance",
    enabled: true,
    threshold: -20,
    gain: 1,
    ratio: 2,
    attack: 13 / 1000,
    release: 360 / 1000,
    knee: 30
  },
  {
    name: "Guitar Charmer",
    enabled: true,
    threshold: -17,
    gain: 1,
    ratio: 3,
    attack: 26 / 1000,
    release: 220 / 1000,
    knee: 30
  },
  {
    name: "Light Mastering",
    enabled: true,
    threshold: -3.6,
    gain: Math.sqrt(Math.pow(Math.E, 2 / 10)),
    ratio: 2.5,
    attack: 3.3 / 1000,
    release: 24 / 1000,
    knee: 30
  },
  {
    name: "Low-Mid Enhancer",
    enabled: true,
    threshold: -9.8,
    gain: Math.sqrt(Math.pow(Math.E, 9 / 10)),
    ratio: 9.2,
    attack: 87 / 1000,
    release: 1,
    knee: 30
  },
  {
    name: "More Punch",
    enabled: true,
    threshold: -22.7,
    gain: Math.sqrt(Math.pow(Math.E, 4.2 / 10)),
    ratio: 18.9,
    attack: 56.5 / 1000,
    release: 1,
    knee: 30
  },{
    name: "Pad Treatment",
    enabled: true,
    threshold: -25,
    gain: Math.sqrt(Math.pow(Math.E, 15 / 10)),
    ratio: 5,
    attack: 50 / 1000,
    release: 1,
    knee: 30
  },
  {
    name: "Pancake Better",
    enabled: true,
    threshold: -25,
    gain: Math.sqrt(Math.pow(Math.E, 5 / 10)),
    ratio: 5,
    attack: 1 / 1000,
    release: 500 / 1000,
    knee: 30
  },
  {
    name: "Radio Leveler",
    enabled: true,
    threshold: -12.5,
    gain: Math.sqrt(Math.pow(Math.E, 4.9 / 10)),
    ratio: 4.9,
    attack: 62.2 / 1000,
    release: 1,
    knee: 30
  },
  {
    name: "Vocal Attacker",
    enabled: true,
    threshold: -27.1,
    gain: Math.sqrt(Math.pow(Math.E, 18 / 10)),
    ratio: 20,
    attack: 0 / 1000,
    release: 1,
    knee: 30
  },
  {
    name: "Vocal Booster",
    enabled: true,
    threshold: -10.8,
    gain: Math.sqrt(Math.pow(Math.E, 10.3 / 10)),
    ratio: 11.8,
    attack: 93.2 / 1000,
    release: 1,
    knee: 30
  },
  {
    name: "Voice Leveler",
    enabled: true,
    threshold: -10,
    gain: 1,
    ratio: 12,
    attack: 0,
    release: 100 / 1000,
    knee: 30
  },
  {
    name: "Voice Over",
    enabled: true,
    threshold: -16,
    gain: Math.sqrt(Math.pow(Math.E, 4 / 10)),
    ratio: 8,
    attack: 5 / 1000,
    release: 100 / 1000,
    knee: 30
  },
  {
    name: "Voice Thickener",
    enabled: true,
    threshold: -25,
    gain: Math.sqrt(Math.pow(Math.E, 12 / 10)),
    ratio: 4,
    attack: 0 / 1000,
    release: 200 / 1000,
    knee: 30
  }
])


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
    value: "twitch.tv",
    id: randomId()
  }
}

export function getDefaultURLCondition(): URLCondition {
  return {
    parts: []
  }
}

export function getDefaultURLRule(): URLRule {
  return {
    id: randomId(),
    enabled: true,
    condition: getDefaultURLCondition(),
    type: "SPEED",
    overrideSpeed: 1,
    strict: true 
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

export function getDefaultSpeedPresets() {
  return [0.25, 0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 16]
}

export function getDefaultSpeedSlider() {
  return {min: 0.5, max: 1.5}
}