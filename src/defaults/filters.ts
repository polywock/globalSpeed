import { randomId } from "@/utils/helper"
import { getDefaultFx } from "."
import { FilterInfo, MatrixTemplate, MosaicSvgInit, SvgFilter, TargetFx } from "../types"

export const filterTargets: TargetFx[] = ["element", "backdrop", "both"]

export type FilterName =
	| "blur"
	| "brightness"
	| "contrast"
	| "grayscale"
	| "hueRotate"
	| "invert"
	| "opacity"
	| "sepia"
	| "saturate"
	| "scaleX"
	| "scaleY"
	| "translateX"
	| "translateY"
	| "rotateX"
	| "rotateY"
	| "rotateZ"

export const filterInfos: { [key in FilterName]: FilterInfo } = {
	sepia: {
		ref: {
			min: 0,
			max: 1,
			step: 0.1,
			sliderMin: 0,
			sliderMax: 1,
			default: 0,
			itcStep: 0.5,
			wrappable: true,
		},
		format: (v) => `sepia(${v})`,
	},
	hueRotate: {
		ref: {
			step: 8,
			sliderMin: -180,
			sliderMax: 180,
			sliderStep: 1,
			default: 0,
			itcStep: 180,
		},
		format: (v) => `hue-rotate(${v}deg)`,
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
			wrappable: true,
		},
		format: (v) => `grayscale(${v})`,
	},
	contrast: {
		ref: {
			min: 0,
			step: 0.1,
			sliderMin: 0,
			sliderMax: 5,
			default: 1,
			itcStep: 2.5,
		},
		format: (v) => `contrast(${v})`,
	},
	brightness: {
		ref: {
			min: 0,
			step: 0.1,
			sliderMin: 0,
			sliderMax: 5,
			sliderStep: 0.05,
			default: 1,
			itcStep: 2.5,
		},
		format: (v) => `brightness(${v})`,
	},
	saturate: {
		ref: {
			min: 0,
			step: 0.1,
			sliderMin: 0,
			sliderMax: 5,
			sliderStep: 0.05,
			default: 1,
			itcStep: 2.5,
		},
		format: (v) => `saturate(${v})`,
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
			wrappable: true,
		},
		format: (v) => `invert(${v})`,
	},
	blur: {
		ref: {
			min: 0,
			step: 0.1,
			sliderMin: 0,
			sliderMax: 10,
			sliderStep: 0.1,
			default: 0,
			itcStep: 5,
		},
		format: (v) => `blur(${v}px)`,
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
			wrappable: true,
		},
		format: (v) => `opacity(${v})`,
	},

	scaleX: {
		isTransform: true,
		ref: {
			step: 0.1,
			sliderMin: -1,
			sliderMax: 3,
			sliderStep: 0.04,
			default: 1,
			itcStep: 2,
		},
		format: (v) => `scaleX(${v})`,
	},
	scaleY: {
		isTransform: true,
		ref: {
			step: 0.1,
			sliderMin: -1,
			sliderMax: 3,
			sliderStep: 0.04,
			default: 1,
			itcStep: 2,
		},
		format: (v) => `scaleY(${v})`,
	},
	translateX: {
		isTransform: true,
		ref: {
			step: 1,
			sliderMin: -300,
			sliderMax: 300,
			sliderStep: 5,
			default: 0,
			itcStep: 300,
		},
		format: (v) => `translateX(${v}px)`,
	},
	translateY: {
		isTransform: true,
		ref: {
			step: 1,
			sliderMin: -300,
			sliderMax: 300,
			sliderStep: 5,
			default: 0,
			itcStep: 300,
		},
		format: (v) => `translateY(${v}px)`,
	},
	rotateX: {
		isTransform: true,
		ref: {
			step: 1,
			sliderMin: -180,
			sliderMax: 180,
			sliderStep: 1,
			default: 0,
			itcStep: 180,
		},
		format: (v) => `rotateX(${v}deg)`,
	},
	rotateY: {
		isTransform: true,
		ref: {
			step: 1,
			sliderMin: -180,
			sliderMax: 180,
			sliderStep: 1,
			default: 0,
			itcStep: 180,
		},
		format: (v) => `rotateY(${v}deg)`,
	},
	rotateZ: {
		isTransform: true,
		ref: {
			step: 1,
			sliderMin: -180,
			sliderMax: 180,
			sliderStep: 1,
			default: 0,
			itcStep: 180,
		},
		format: (v) => `rotateZ(${v}deg)`,
	},
}

export function getDefaultCinemaFilter() {
	const filters = getDefaultFx().filters
	filters.find((v) => v.name === "brightness").value = 0.1
	filters.find((v) => v.name === "grayscale").value = 1
	return filters
}

export type SvgFilterName = "mosaic" | "colorMatrix" | "posterize" | "blur" | "sharpen" | "special" | "custom" | "rgb" | "noise" | "motion"

export const SVG_COLOR_MATRIX_PRESETS: MatrixTemplate[] = [
	{
		id: "grayscale",
		values: [0.33, 0.33, 0.33, 0, 0.33, 0.33, 0.33, 0, 0.33, 0.33, 0.33, 0],
	},
	{
		id: "coolTone",
		values: [0.9, 0, 0, 0, 0, 0.9, 0, 0, 0, 0.2, 1.0, 0],
	},
	{
		id: "duotoneRedCyan",
		values: [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0],
	},
	{
		id: "posterize",
		values: [1.0, 0, 0, -0.33, 0, 1.0, 0, -0.33, 0, 0, 1.0, -0.33],
	},
	{
		id: "psychedelicMix",
		values: [1, -0.5, 0.5, 0, 0.5, 1, -0.5, 0, -0.5, 0.5, 1, 0],
	},
	{
		id: "neonGlow",
		values: [1.0, 0.2, 0.2, 0.1, 0.2, 1.0, 0.2, 0.1, 0.2, 0.2, 1.0, 0.1],
	},
	{
		id: "dreamyPastel",
		values: [0.8, 0.2, 0.2, 0.2, 0.2, 0.8, 0.2, 0.2, 0.2, 0.2, 0.8, 0.2],
	},
	{
		id: "ghostlyFade",
		values: [0.6, 0.2, 0.2, 0, 0.2, 0.6, 0.2, 0, 0.2, 0.2, 0.6, 0],
	},
	{
		id: "toxicGreen",
		values: [0.2, 1.0, 0.2, 0, 0.1, 0.9, 0.1, 0, 0.1, 0.8, 0.1, 0],
	},
	{
		id: "lavaHeat",
		values: [1.0, 0.25, 0, 0, 0.2, 0.8, 0, 0, 0, 0.2, 0.3, 0],
	},
	{
		id: "midnightBlues",
		values: [0.25, 0.25, 0.7, 0, 0.2, 0.4, 0.8, 0, 0.1, 0.2, 0.9, 0],
	},
	{
		id: "retroVHS",
		values: [1.0, 0.25, 0, 0.1, 0, 1.0, 0.25, 0.1, 0.25, 0, 1.0, 0.1],
	},
	{
		id: "asRed",
		values: [0.333, 0.333, 0.333, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	},
	{
		id: "asGreen",
		values: [0, 0, 0, 0, 0.333, 0.333, 0.333, 0, 0, 0, 0, 0],
	},
	{
		id: "asBlue",
		values: [0, 0, 0, 0, 0, 0, 0, 0, 0.333, 0.333, 0.333, 0],
	},
	{
		id: "protanopia",
		values: [0.56667, 0.43333, 0.0, 0, 0.55833, 0.44167, 0.0, 0, 0.0, 0.24167, 0.75833, 0],
	},
	{
		id: "deuteranopia",
		values: [0.625, 0.375, 0.0, 0, 0.7, 0.3, 0.0, 0, 0.0, 0.3, 0.7, 0],
	},
	{
		id: "tritanopia",
		values: [0.95, 0.05, 0.0, 0, 0.0, 0.43333, 0.56667, 0, 0.0, 0.475, 0.525, 0],
	},
	{
		id: "protanomalyMild",
		values: [0.78333, 0.21667, 0.0, 0, 0.24276, 0.75724, 0.0, 0, 0.0, 0.12083, 0.87917, 0],
	},
	{
		id: "deuteranomalyMild",
		values: [0.8125, 0.1875, 0.0, 0, 0.35, 0.65, 0.0, 0, 0.0, 0.15, 0.85, 0],
	},
	{
		id: "tritanomalyMild",
		values: [0.975, 0.025, 0.0, 0, 0.0, 0.71667, 0.28333, 0, 0.0, 0.2375, 0.7625, 0],
	},
	{
		id: "achromatopsia",
		values: [0.2126, 0.7152, 0.0722, 0, 0.2126, 0.7152, 0.0722, 0, 0.2126, 0.7152, 0.0722, 0],
	},
]

export const SVG_RGB_PRESETS: { id: string; values: number[] }[] = [
	{ id: "onlyRed", values: [1, 0, 0] },
	{ id: "onlyGreen", values: [0, 1, 0] },
	{ id: "onlyBlue", values: [0, 0, 1] },
	{ id: "orange", values: [1, 0.5, 0] },
	{ id: "rose", values: [1, 0.31, 0.47] },
	{ id: "emerald", values: [0.31, 0.78, 0.47] },
	{ id: "cerulean", values: [0, 0.48, 0.65] },
	{ id: "violet", values: [0.6, 0.2, 0.9] },
	{ id: "gold", values: [1, 0.84, 0] },
	{ id: "mint", values: [0.6, 1, 0.8] },
	{ id: "coral", values: [1, 0.5, 0.31] },
	{ id: "amethyst", values: [0.6, 0.4, 0.8] },
	{ id: "hotRed", values: [2.5, 0.3, 0.3] },
	{ id: "neonGreen", values: [0.3, 3, 0.3] },
	{ id: "neonBlue", values: [0.3, 0.8, 3] },
	{ id: "laserCyan", values: [0.2, 2.5, 3] },
	{ id: "plasmaMagenta", values: [3, 0.4, 2.5] },
	{ id: "infraOrange", values: [3, 1.2, 0.2] },
	{ id: "electricPurple", values: [1.8, 0.2, 3] },
	{ id: "hyperYellow", values: [3, 3, 0.2] },
	{ id: "glowTeal", values: [0.2, 2.2, 1.6] },
]

export const SVG_MOSAIC_PRESETS = [
	{
		id: "pixelate",
		values: {
			blockX: 3,
			blockY: 3,
			sampleNormalX: 0,
			sampleNormalY: 0,
			scalingNormalX: 1,
			scalingNormalY: 1,
		} satisfies Partial<MosaicSvgInit>,
	},
	{
		id: "disco",
		values: {
			blockX: 10,
			blockY: 10,
			sampleNormalX: 0,
			sampleNormalY: 0,
			scalingNormalX: 0.92,
			scalingNormalY: 0.92,
			blockAspect: true,
			sampleAspect: true,
			scalingAspect: true,
		} satisfies Partial<MosaicSvgInit>,
	},
	{
		id: "blockyLights",
		values: {
			blockX: 20,
			blockY: 20,
			sampleNormalX: 0.683,
			sampleNormalY: 0.683,
			scalingNormalX: 1,
			scalingNormalY: 1,
		} satisfies Partial<MosaicSvgInit>,
	},
	{
		id: "grid",
		values: {
			blockX: 10,
			blockY: 10,
			sampleNormalX: 0.876,
			sampleNormalY: 0.876,
			scalingNormalX: 0.25,
			scalingNormalY: 0.25,
		} satisfies Partial<MosaicSvgInit>,
	},
	{
		id: "dots",
		values: {
			blockX: 10,
			blockY: 10,
			sampleNormalX: 0.2,
			sampleNormalY: 0.2,
			scalingNormalX: 0,
			scalingNormalY: 0,
		} satisfies Partial<MosaicSvgInit>,
	},
	{
		id: "visorX",
		values: {
			blockX: 10,
			blockY: 10,
			sampleNormalX: 0.2,
			sampleNormalY: 0.2,
			scalingNormalX: 3,
			scalingNormalY: 0.75,
		} satisfies Partial<MosaicSvgInit>,
	},
	{
		id: "visorY",
		values: {
			blockX: 10,
			blockY: 10,
			sampleNormalX: 0.2,
			sampleNormalY: 0.2,
			scalingNormalX: 0.75,
			scalingNormalY: 3,
		} satisfies Partial<MosaicSvgInit>,
	},
	{
		id: "pastel",
		values: {
			blockX: 4,
			blockY: 4,
			sampleNormalX: 0.5,
			sampleNormalY: 0.5,
			scalingNormalX: 10,
			scalingNormalY: 10,
		} satisfies Partial<MosaicSvgInit>,
	},
	{
		id: "pastelStrong",
		values: {
			blockX: 4,
			blockY: 4,
			sampleNormalX: 0.25,
			sampleNormalY: 0.25,
			scalingNormalX: 10,
			scalingNormalY: 10,
		} satisfies Partial<MosaicSvgInit>,
	},
	{
		id: "wipeX",
		values: {
			blockX: 4,
			blockY: 4,
			sampleNormalX: 0,
			sampleNormalY: 0,
			scalingNormalX: 10,
			scalingNormalY: 1,
		} satisfies Partial<MosaicSvgInit>,
	},
	{
		id: "wipeY",
		values: {
			blockX: 4,
			blockY: 4,
			sampleNormalX: 0,
			sampleNormalY: 0,
			scalingNormalX: 1,
			scalingNormalY: 10,
		} satisfies Partial<MosaicSvgInit>,
	},
	{
		id: "facelessX",
		values: {
			blockX: 4,
			blockY: 4,
			sampleNormalX: 0.65,
			sampleNormalY: 0.65,
			scalingNormalX: 15,
			scalingNormalY: 1,
		} satisfies Partial<MosaicSvgInit>,
	},
	{
		id: "facelessY",
		values: {
			blockX: 4,
			blockY: 4,
			sampleNormalX: 0.65,
			sampleNormalY: 0.65,
			scalingNormalX: 1,
			scalingNormalY: 15,
		} satisfies Partial<MosaicSvgInit>,
	},
]

export const SVG_SPECIAL_PRESETS = [
	{
		id: "edgeDetect",
		values: `<feConvolveMatrix order="3" kernelMatrix="0 1 0  1 -4 1  0 1 0" divisor="1" bias="0" edgeMode="duplicate" preserveAlpha="true"/>`,
	},
	{
		id: "charcoal",
		values: `<feColorMatrix in="SourceGraphic" type="saturate" values="0" result="gray"/> <!-- Stronger Laplacian (center tap -6) --> <feConvolveMatrix in="gray" result="edges" order="3" edgeMode="duplicate" preserveAlpha="true" kernelMatrix=" 0  1  0 1 -6  1 0  1  0"/> <!-- Expand strokes slightly --> <feMorphology in="edges" operator="dilate" radius="0.5" result="thick"/> <!-- Blend back --> <feBlend in="gray" in2="thick" mode="multiply" result="charcoal"/> <!-- Crush shadows --> <feComponentTransfer in="charcoal"> <feFuncR type="gamma" exponent="1.3"/> <feFuncG type="gamma" exponent="1.3"/> <feFuncB type="gamma" exponent="1.3"/></feComponentTransfer>`,
	},
	{
		id: "bloom",
		values: `<feComponentTransfer in="SourceGraphic" result="bright"><feFuncR type="table" tableValues="0 0 0.2 0.6 1"/> <feFuncG type="table" tableValues="0 0 0.2 0.6 1"/> <feFuncB type="table" tableValues="0 0 0.2 0.6 1"/> </feComponentTransfer><feGaussianBlur in="bright" stdDeviation="2.5" result="glow"/><feBlend in="SourceGraphic" in2="glow" mode="screen"/>`,
	},
	{
		id: "luminary",
		values: `<feColorMatrix in="SourceGraphic" type="matrix" result="lum" values=" 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0      0      0      1 0"/> <feComponentTransfer in="lum" result="toon"> <feFuncR type="discrete" tableValues="0.15 0.55 0.9"/> <feFuncG type="discrete" tableValues="0.15 0.55 0.9"/> <feFuncB type="discrete" tableValues="0.15 0.55 0.9"/> </feComponentTransfer> <feBlend in="SourceGraphic" in2="toon" mode="multiply" result="cel"/> <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="g"/> <feConvolveMatrix in="g" result="edge" order="3" edgeMode="duplicate" preserveAlpha="true" kernelMatrix="0 1 0  1 -4 1  0 1 0"/> <feComponentTransfer in="edge" result="lines"> <feFuncR type="table" tableValues="0 0 0 1 1"/> <feFuncG type="table" tableValues="0 0 0 1 1"/> <feFuncB type="table" tableValues="0 0 0 1 1"/> </feComponentTransfer> <feBlend in="cel" in2="lines" mode="screen"/>`,
	},
	{
		id: "glitch",
		values: `<feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0.2 0.2 0.2 1 0" result="shifted"/> <feOffset in="shifted" dx="5" dy="0" result="redshift"/> <feBlend in="SourceGraphic" in2="redshift" mode="difference"/>`,
	},
	{
		id: "hueSpin",
		values: `<feColorMatrix in="SourceGraphic" type="hueRotate" values="0"><animate attributeName="values" from="0" to="360" dur="6s" repeatCount="indefinite"/></feColorMatrix>`,
	},
	{
		id: "neonFlicker",
		values: `<feComponentTransfer in="SourceGraphic" result="step1"><feFuncR type="gamma" amplitude="1" exponent="1" offset="0"><animate attributeName="exponent" values="1;0.8;1.3;1" dur="1.8s" repeatCount="indefinite"/></feFuncR><feFuncG type="gamma" amplitude="1" exponent="1" offset="0"><animate attributeName="exponent" values="1;0.85;1.2;1" dur="1.8s" repeatCount="indefinite"/></feFuncG><feFuncB type="gamma" amplitude="1" exponent="1" offset="0"><animate attributeName="exponent" values="1;0.9;1.4;1" dur="1.8s" repeatCount="indefinite"/></feFuncB></feComponentTransfer>`,
	},
]

export const svgFilterInfos: {
	[key in SvgFilterName]: {
		generate: () => Partial<SvgFilter>
	}
} = {
	rgb: {
		generate: () => ({
			type: "rgb",
			rgb: [1, 1, 1],
		}),
	},
	mosaic: {
		generate: () => {
			const m = structuredClone(SVG_MOSAIC_PRESETS[0].values)
			m.blockAspect = m.scalingAspect = m.sampleAspect = true
			return {
				type: "mosaic",
				mosaic: m as any,
			}
		},
	},
	colorMatrix: {
		generate: () => ({
			type: "colorMatrix",
			colorMatrix: SVG_COLOR_MATRIX_PRESETS[0].values,
		}),
	},
	posterize: {
		generate: () => ({
			type: "posterize",
			posterize: 4,
		}),
	},
	blur: {
		generate: () => ({
			type: "blur",
			blur: { x: 0, y: 0 },
		}),
	},
	sharpen: {
		generate: () => ({
			type: "sharpen",
			sharpen: 0,
		}),
	},
	noise: {
		generate: () => ({
			type: "noise",
			noise: {
				size: 0.8,
				speed: 1,
				mode: "hard-light",
			},
		}),
	},
	motion: {
		generate: () => ({
			type: "motion",
			motion: {
				x: 40,
				y: 0,
				speed: 1,
			},
		}),
	},
	special: {
		generate: () => ({
			type: "special",
			specialType: "edgeDetect",
		}),
	},
	custom: {
		generate: () => ({
			type: "custom",
			text: `<filter x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8" /></filter>`,
		}),
	},
}

export function svgFilterIsValid(filter: SvgFilter, isValid?: (filter: SvgFilter) => boolean) {
	if (isValid) return isValid(filter)
	return true
}

export function svgFilterGenerate(cmd: SvgFilterName): SvgFilter {
	return { ...svgFilterInfos[cmd].generate(), id: randomId(), enabled: true } as SvgFilter
}
