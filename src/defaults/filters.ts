import { randomId } from "src/utils/helper"
import { getDefaultFx } from "."
import { FilterInfo, MatrixTemplate, MosaicSvgInit, SvgFilter, SvgFilterInfo, TargetFx } from "../types"

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


export function getDefaultCinemaFilter() {
  const filters = getDefaultFx().filters
  filters.find(v => v.name === "brightness").value = 0.1
  filters.find(v => v.name === "grayscale").value = 1 
  return filters 
}

export type SvgFilterName = "mosaic" | "colorMatrix" | "posterize" | "blur" | "text"


export const SVG_COLOR_MATRIX_PRESETS: MatrixTemplate[] = [
  {
    id: "onlyRed",
    values: [
      1, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0
    ]
  },
  {
    id: "onlyGreen",
    values: [
      0, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 0, 0
    ]
  },
  {
    id: "onlyBlue",
    values: [
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 1, 0
    ]
  },
  {
    id: "grayscale",
    values: [
      0.33, 0.33, 0.33, 0,
      0.33, 0.33, 0.33, 0,
      0.33, 0.33, 0.33, 0
    ]
  },
  {
    id: "coolTone",
    values: [
      0.9, 0,   0,   0,
      0,   0.9, 0,   0,
      0,   0.2, 1.0, 0
    ]
  },
  {
    id: "duotoneRedCyan",
    values: [
      1,   0,   0,   0,
      0,   0,   1,   0,
      0,   1,   1,   0
    ]
  },
  {
    id: "posterize",
    values: [
      1.0, 0,   0, -0.33,
      0,   1.0, 0, -0.33,
      0,   0,   1.0, -0.33
    ]
  },
  {
    id: "psychedelicMix",
    values: [
      1,   -0.5, 0.5, 0,  
      0.5,  1,  -0.5, 0,
     -0.5,  0.5,  1,  0
    ]
  },
  {
    id: "neonGlow",
    values: [
      1.0, 0.2, 0.2, 0.1,
      0.2, 1.0, 0.2, 0.1,
      0.2, 0.2, 1.0, 0.1
    ]
  },
  {
    id: "dreamyPastel",
    values: [
      0.8, 0.2, 0.2, 0.2,
      0.2, 0.8, 0.2, 0.2,
      0.2, 0.2, 0.8, 0.2
    ]
  },
  {
    id: "ghostlyFade",
    values: [
      0.6, 0.2, 0.2, 0,
      0.2, 0.6, 0.2, 0,
      0.2, 0.2, 0.6, 0
    ]
  },
  {
    id: "toxicGreen",
    values: [
      0.2, 1.0, 0.2, 0, 
      0.1, 0.9, 0.1, 0, 
      0.1, 0.8, 0.1, 0 
    ]
  },
  {
    id: "lavaHeat",
    values: [
      1.0, 0.25, 0, 0,
      0.2, 0.8,  0, 0,
      0,   0.2, 0.3, 0
    ]
  },
  {
    id: "midnightBlues",
    values: [
      0.25, 0.25, 0.7, 0,
      0.2,  0.4,  0.8, 0,
      0.1,  0.2,  0.9, 0
    ]
  },
  {
    id: "retroVHS",
    values: [
      1.0, 0.25, 0, 0.1,
      0,   1.0, 0.25, 0.1,
      0.25, 0,  1.0, 0.1
    ]
  },
  {
    id: "asRed",
    values: [
      0.333, 0.333, 0.333, 0,
      0, 0, 0, 0,
      0, 0, 0, 0
    ]
  },
  {
    id: "asGreen",
    values: [
      0, 0, 0, 0,
      0.333, 0.333, 0.333, 0,
      0, 0, 0, 0
    ]
  },
  {
    id: "asBlue",
    values: [
      0, 0, 0, 0,
      0, 0, 0, 0,
      0.333, 0.333, 0.333, 0
    ]
  },
  {
    id: "protanopia",
    values: [
      0.56667, 0.43333, 0.00000, 0,
      0.55833, 0.44167, 0.00000, 0,
      0.00000, 0.24167, 0.75833, 0
    ]
  },
  {
    id: "deuteranopia",
    values: [
      0.62500, 0.37500, 0.00000, 0,
      0.70000, 0.30000, 0.00000, 0,
      0.00000, 0.30000, 0.70000, 0
    ]
  },
  {
    id: "tritanopia",
    values: [
      0.95000, 0.05000, 0.00000, 0,
      0.00000, 0.43333, 0.56667, 0,
      0.00000, 0.47500, 0.52500, 0
    ]
  },
  {
    id: "protanomalyMild",
    values: [
      0.78333, 0.21667, 0.00000, 0,
      0.24276, 0.75724, 0.00000, 0,
      0.00000, 0.12083, 0.87917, 0
    ]
  },
  {
    id: "deuteranomalyMild",
    values: [
      0.81250, 0.18750, 0.00000, 0,
      0.35000, 0.65000, 0.00000, 0,
      0.00000, 0.15000, 0.85000, 0
    ]
  },
  {
    id: "tritanomalyMild",
    values: [
      0.97500, 0.02500, 0.00000, 0,
      0.00000, 0.71667, 0.28333, 0,
      0.00000, 0.23750, 0.76250, 0
    ]
  },
  {
    id: "achromatopsia",
    values: [
      0.21260, 0.71520, 0.07220, 0,
      0.21260, 0.71520, 0.07220, 0,
      0.21260, 0.71520, 0.07220, 0
    ]
  }
]


export const SVG_MOSAIC_PRESETS = [
   {
      id: 'pixelate',
      values: {
        blockX: 3,
        blockY: 3,
        sampleNormalX: 0,
        sampleNormalY: 0,
        scalingNormalX: 1,
        scalingNormalY: 1,
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'disco',
      values: {
        blockX: 10,
        blockY: 10,
        sampleNormalX: 0,
        sampleNormalY: 0,
        scalingNormalX: 0.92,
        scalingNormalY: 0.92,
        blockAspect: true,
        sampleAspect: true,
        scalingAspect: true
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'blockyLights',
      values: {
        blockX: 20,
        blockY: 20,
        sampleNormalX: 0.683,
        sampleNormalY: 0.683,
        scalingNormalX: 1,
        scalingNormalY: 1
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'grid',
      values: {
        blockX: 10,
        blockY: 10,
        sampleNormalX: 0.876,
        sampleNormalY: 0.876,
        scalingNormalX: 0.25,
        scalingNormalY: 0.25
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'dots',
      values: {
        blockX: 10,
        blockY: 10,
        sampleNormalX: 0.2,
        sampleNormalY: 0.2,
        scalingNormalX: 0,
        scalingNormalY: 0
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'visorX',
      values: {
        blockX: 10,
        blockY: 10,
        sampleNormalX: 0.2,
        sampleNormalY: 0.2,
        scalingNormalX: 3,
        scalingNormalY: 0.75
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'visorY',
      values: {
        blockX: 10,
        blockY: 10,
        sampleNormalX: 0.2,
        sampleNormalY: 0.2,
        scalingNormalX: 0.75,
        scalingNormalY: 3
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'pastel',
      values: {
        blockX: 4,
        blockY: 4,
        sampleNormalX: 0.5,
        sampleNormalY: 0.5,
        scalingNormalX: 10,
        scalingNormalY: 10
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'pastelStrong',
      values: {
        blockX: 4,
        blockY: 4,
        sampleNormalX: 0.25,
        sampleNormalY: 0.25,
        scalingNormalX: 10,
        scalingNormalY: 10
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'wipeX',
      values: {
        blockX: 4,
        blockY: 4,
        sampleNormalX: 0,
        sampleNormalY: 0,
        scalingNormalX: 10,
        scalingNormalY: 1
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'wipeY',
      values: {
        blockX: 4,
        blockY: 4,
        sampleNormalX: 0,
        sampleNormalY: 0,
        scalingNormalX: 1,
        scalingNormalY: 10
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'facelessX',
      values: {
        blockX: 4,
        blockY: 4,
        sampleNormalX: 0.65,
        sampleNormalY: 0.65,
        scalingNormalX: 15,
        scalingNormalY: 1
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'facelessY',
      values: {
        blockX: 4,
        blockY: 4,
        sampleNormalX: 0.65,
        sampleNormalY: 0.65,
        scalingNormalX: 1,
        scalingNormalY: 15
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'parasyteX',
      values: {
        blockX: 10,
        blockY: 1,
        sampleNormalX: 0,
        sampleNormalY: 0,
        scalingNormalX: 1,
        scalingNormalY: 1
      } satisfies Partial<MosaicSvgInit>
   },
   {
      id: 'parasyteY',
      values: {
        blockX: 1,
        blockY: 10,
        sampleNormalX: 0,
        sampleNormalY: 0,
        scalingNormalX: 1,
        scalingNormalY: 1
      } satisfies Partial<MosaicSvgInit>
   }
]


export const svgFilterInfos: {[key in SvgFilterName]: SvgFilterInfo} = {
  mosaic: {
    generate: () => ({
      type: 'mosaic',
      enabled: true,
      id: randomId(),
      mosaic: {
        blockX: 4,
        blockY: 4,
        blockAspect: true,
        sampleNormalX: 0,
        sampleNormalY: 0,
        sampleAspect: true,
        scalingNormalX: 1,
        scalingNormalY: 1,
        scalingAspect: true,
      }
    })
  },
  colorMatrix: {
    generate: () => ({
      type: 'colorMatrix',
      id: randomId(),
      enabled: true,
      colorMatrix: SVG_COLOR_MATRIX_PRESETS[0].values
    })
  },
  posterize: {
    generate: () => ({
      type: 'posterize',
      id: randomId(),
      enabled: true,
      posterize: 4
    })
  },
  blur: {
    generate: () => ({
      type: 'blur',
      id: randomId(),
      enabled: true,
      blur: {x: 0, y: 0}
    })
  },
  text: {
    generate: () => ({
      type: 'text',
      enabled: true,
      id: randomId(),
      text: `<filter x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8" /></filter>`
    })
  }
}