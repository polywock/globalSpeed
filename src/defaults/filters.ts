import { FilterInfo, TargetFx } from "../types"

export const filterTargets: TargetFx[] = ["element", "backdrop", "both"] 

export type FilterName = 
  "blur" | "brightness" | "contrast" | "grayscale" | "hueRotate" | "invert" | "opacity" | "sepia" | "saturate" | 
  "scaleX" | "scaleY" | "translateX" | "translateY" | "rotateX" | "rotateY" | "rotateZ"


export const filterInfos: {[key in FilterName]: FilterInfo} = {
  sepia: {
    min: 0,
    max: 1,
    step: 0.1,
    sliderMin: 0,
    sliderMax: 1,
    default: 0,
    format: v => `sepia(${v})`
  },
  hueRotate: {
    step: 8,
    sliderMin: -180,
    sliderMax: 180,
    sliderStep: 1,
    default: 0,
    format: v => `hue-rotate(${v}deg)`
  },
  grayscale: {
    min: 0,
    max: 1,
    step: 0.1,
    sliderMin: 0,
    sliderMax: 1,
    default: 0,
    format: v => `grayscale(${v})`
  },
  contrast: {
    min: 0,
    step: 0.1,
    sliderMin: 0,
    sliderMax: 5,
    default: 1,
    format: v => `contrast(${v})`
  },
  brightness: {
    min: 0,
    step: 0.1,
    sliderMin: 0,
    sliderMax: 5,
    sliderStep: 0.05,
    default: 1,
    format: v => `brightness(${v})`
  },
  saturate: {
    min: 0,
    step: 0.1,
    sliderMin: 0,
    sliderMax: 5,
    sliderStep: 0.05,
    default: 1,
    format: v => `saturate(${v})`
  },
  invert: {
    min: 0,
    max: 1,
    step: 0.1,
    sliderMin: 0,
    sliderMax: 1,
    default: 0,
    format: v => `invert(${v})`
  },
  blur: {
    min: 0,
    step: 0.1,
    sliderMin: 0,
    sliderMax: 10,
    sliderStep: 0.1,
    default: 0,
    format: v => `blur(${v}px)`
  },
  opacity: {
    min: 0,
    max: 1,
    step: 0.1,
    sliderMin: 0,
    sliderMax: 1,
    default: 1,
    format: v => `opacity(${v})`
  },

  scaleX: {
    isTransform: true,
    step: 0.1,
    sliderMin: -1,
    sliderMax: 3,
    sliderStep: 0.04,
    default: 1,
    format: v => `scaleX(${v})`
  },
  scaleY: {
    isTransform: true,
    step: 0.1,
    sliderMin: -1,
    sliderMax: 3,
    sliderStep: 0.04,
    default: 1,
    format: v => `scaleY(${v})`
  },
  translateX: {
    isTransform: true,
    step: 1,
    sliderMin: -300,
    sliderMax: 300,
    sliderStep: 5,
    default: 0,
    format: v => `translateX(${v}px)`
  },
  translateY: {
    isTransform: true,
    step: 1,
    sliderMin: -300,
    sliderMax: 300,
    sliderStep: 5,
    default: 0,
    format: v => `translateY(${v}px)`
  },
  rotateX: {
    isTransform: true,
    step: 1,
    sliderMin: -180,
    sliderMax: 180,
    sliderStep: 1,
    default: 0,
    format: v => `rotateX(${v}deg)`
  },
  rotateY: {
    isTransform: true,
    step: 1,
    sliderMin: -180,
    sliderMax: 180,
    sliderStep: 1,
    default: 0,
    format: v => `rotateY(${v}deg)`
  },
  rotateZ: {
    isTransform: true,
    step: 1,
    sliderMin: -180,
    sliderMax: 180,
    sliderStep: 1,
    default: 0,
    format: v => `rotateZ(${v}deg)`
  }
}


