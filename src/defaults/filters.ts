import { FilterInfo, FilterTarget } from "../types"

export const filterTargets: FilterTarget[] = ["enabled", "element", "backdrop", "both"] 

export type FilterName = "blur" | "brightness" | "contrast" | "grayscale" | "hue-rotate" | "invert" | "opacity" | "sepia" | "saturate"


export const filterInfos: {[key in FilterName]: FilterInfo} = {
  sepia: {
    name: chrome.i18n.getMessage("filterInfo__sepia"),
    min: 0,
    max: 1,
    smallStep: 0.1,
    largeStep: 0.25,
    default: 0,
    format: v => `sepia(${v})`
  },
  "hue-rotate": {
    name: chrome.i18n.getMessage("filterInfo__hueRotate"),
    smallStep: 8,
    largeStep: 32,
    default: 0,
    format: v => `hue-rotate(${v}deg)`
  },
  grayscale: {
    name: chrome.i18n.getMessage("filterInfo__grayscale"),
    min: 0,
    max: 1,
    smallStep: 0.1,
    largeStep: 0.25,
    default: 0,
    format: v => `grayscale(${v})`
  },
  contrast: {
    name: chrome.i18n.getMessage("filterInfo__contrast"),
    min: 0,
    smallStep: 0.1,
    largeStep: 1,
    default: 1,
    format: v => `contrast(${v})`
  },
  brightness: {
    name: chrome.i18n.getMessage("filterInfo__brightness"),
    min: 0,
    smallStep: 0.1,
    largeStep: 1,
    default: 1,
    format: v => `brightness(${v})`
  },
  saturate: {
    name: chrome.i18n.getMessage("filterInfo__saturate"),
    min: 0,
    smallStep: 0.1,
    largeStep: 1,
    default: 1,
    format: v => `saturate(${v})`
  },
  invert: {
    name: chrome.i18n.getMessage("filterInfo__invert"),
    min: 0,
    max: 1,
    smallStep: 0.1,
    largeStep: 1,
    default: 0,
    format: v => `invert(${v})`
  },
  blur: {
    name: chrome.i18n.getMessage("filterInfo__blur"),
    min: 0,
    smallStep: 0.1,
    largeStep: 1,
    default: 0,
    format: v => `blur(${v}px)`
  },
  opacity: {
    name: chrome.i18n.getMessage("filterInfo__opacity"),
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