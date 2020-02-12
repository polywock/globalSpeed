import { FilterInfo, FilterTarget } from "../types"

export const filterTargets: FilterTarget[] = ["enabled", "element", "backdrop", "both"] 

export type FilterName = "blur" | "brightness" | "contrast" | "grayscale" | "hue-rotate" | "invert" | "opacity" | "sepia" | "saturate"


export const filterInfos: {[key in FilterName]: FilterInfo} = {
  grayscale: {
    name: "grayscale",
    min: 0,
    max: 1,
    smallStep: 0.1,
    largeStep: 0.25,
    default: 0,
    format: v => `grayscale(${v})`
  },
  sepia: {
    name: "sepia",
    min: 0,
    max: 1,
    smallStep: 0.1,
    largeStep: 0.25,
    default: 0,
    format: v => `sepia(${v})`
  },
  "hue-rotate": {
    name: "hue-rotate",
    smallStep: 8,
    largeStep: 32,
    default: 0,
    format: v => `hue-rotate(${v}deg)`
  },
  contrast: {
    name: "contrast",
    min: 0,
    smallStep: 0.1,
    largeStep: 1,
    default: 1,
    format: v => `contrast(${v})`
  },
  brightness: {
    name: "brightness",
    min: 0,
    smallStep: 0.1,
    largeStep: 1,
    default: 1,
    format: v => `brightness(${v})`
  },
  saturate: {
    name: "saturate",
    min: 0,
    smallStep: 0.1,
    largeStep: 1,
    default: 1,
    format: v => `saturate(${v})`
  },
  invert: {
    name: "invert",
    min: 0,
    max: 1,
    smallStep: 0.1,
    largeStep: 1,
    default: 0,
    format: v => `invert(${v})`
  },
  blur: {
    name: "blur",
    min: 0,
    smallStep: 0.1,
    largeStep: 1,
    default: 0,
    format: v => `blur(${v}px)`
  },
  opacity: {
    name: "opacity",
    min: 0,
    max: 1,
    smallStep: 0.1,
    largeStep: 0.25,
    default: 1,
    format: v => `opacity(${v})`
  },
}

export function getDefaultFilterValues() {
  return Object.entries(filterInfos).map(([k, v]) => ({filter: k as FilterName, value: v.default}))
}