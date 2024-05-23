import { FilterInfo, TargetFx } from "../types"

export const filterTargets: TargetFx[] = ["element", "backdrop", "both"] 

export type FilterName = 
  "blur" | "brightness" | "contrast" | "grayscale" | "hueRotate" | "invert" | "opacity" | "sepia" | "saturate" | 
  "scaleX" | "scaleY" | "translateX" | "translateY" | "rotateX" | "rotateY" | "rotateZ"


export const filterInfos: {[key in FilterName]: FilterInfo} = {
  sepia: {
    ref: {
      min: 0,
      max: 1,
      step: 0.1,
      sliderMin: 0,
      sliderMax: 1,
      default: 0,
      itcStep: 0.5,
      wrappable: true 
    },
    format: v => `sepia(${v})`
  },
  hueRotate: {
    ref: {
      step: 8,
      sliderMin: -180,
      sliderMax: 180,
      sliderStep: 1,
      default: 0,
      itcStep: 180
    },
    format: v => `hue-rotate(${v}deg)`
  },
  grayscale: {
    ref: {
      min: 0,
      max: 1,
      step: 0.1,
      sliderMin: 0,
      sliderMax: 1,
      default: 0,
      itcStep: 0.5,
      wrappable: true 
    },
    format: v => `grayscale(${v})`
  },
  contrast: {
    ref: {
      min: 0,
      step: 0.1,
      sliderMin: 0,
      sliderMax: 5,
      default: 1,
      itcStep: 2.5
    },
    format: v => `contrast(${v})`
  },
  brightness: {
    ref: {
      min: 0,
      step: 0.1,
      sliderMin: 0,
      sliderMax: 5,
      sliderStep: 0.05,
      default: 1,
      itcStep: 2.5
    },
    format: v => `brightness(${v})`
  },
  saturate: {
    ref: {
      min: 0,
      step: 0.1,
      sliderMin: 0,
      sliderMax: 5,
      sliderStep: 0.05,
      default: 1,
      itcStep: 2.5
    },
    format: v => `saturate(${v})`
  },
  invert: {
    ref: {
      min: 0,
      max: 1,
      step: 0.1,
      sliderMin: 0,
      sliderMax: 1,
      default: 0,
      itcStep: 0.5,
      wrappable: true 
    },
    format: v => `invert(${v})`
  },
  blur: {
    ref: {
      min: 0,
      step: 0.1,
      sliderMin: 0,
      sliderMax: 10,
      sliderStep: 0.1,
      default: 0,
      itcStep: 5
    },
    format: v => `blur(${v}px)`
  },
  opacity: {
    ref: {
      min: 0,
      max: 1,
      step: 0.1,
      sliderMin: 0,
      sliderMax: 1,
      default: 1,
      itcStep: 0.5,
      wrappable: true 
    },
    format: v => `opacity(${v})`
  },

  scaleX: {
    isTransform: true,
    ref: {
      step: 0.1,
      sliderMin: -1,
      sliderMax: 3,
      sliderStep: 0.04,
      default: 1,
      itcStep: 2
    },
    format: v => `scaleX(${v})`
  },
  scaleY: {
    isTransform: true,
    ref: {
      step: 0.1,
      sliderMin: -1,
      sliderMax: 3,
      sliderStep: 0.04,
      default: 1,
      itcStep: 2
    },
    format: v => `scaleY(${v})`
  },
  translateX: {
    isTransform: true,
    ref: {
      step: 1,
      sliderMin: -300,
      sliderMax: 300,
      sliderStep: 5,
      default: 0,
      itcStep: 300
    },
    format: v => `translateX(${v}px)`
  },
  translateY: {
    isTransform: true,
    ref: {
      step: 1,
      sliderMin: -300,
      sliderMax: 300,
      sliderStep: 5,
      default: 0,
      itcStep: 300
    },
    format: v => `translateY(${v}px)`
  },
  rotateX: {
    isTransform: true,
    ref: {
      step: 1,
      sliderMin: -180,
      sliderMax: 180,
      sliderStep: 1,
      default: 0,
      itcStep: 180
    },
    format: v => `rotateX(${v}deg)`
  },
  rotateY: {
    isTransform: true,
    ref: {
      step: 1,
      sliderMin: -180,
      sliderMax: 180,
      sliderStep: 1,
      default: 0,
      itcStep: 180
    },
    format: v => `rotateY(${v}deg)`
  },
  rotateZ: {
    isTransform: true,
    ref: {
      step: 1,
      sliderMin: -180,
      sliderMax: 180,
      sliderStep: 1,
      default: 0,
      itcStep: 180
    },
    format: v => `rotateZ(${v}deg)`
  }
}


