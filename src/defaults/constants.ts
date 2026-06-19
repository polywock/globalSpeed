import { type CinemaInit } from "@/types"

export const MIN_SPEED_CHROMIUM = 0.07
export const MAX_SPEED_CHROMIUM = 16

export const DEFAULT_LONG_PRESS_THRESHOLD = 400
export const DEFAULT_DOUBLE_TAP_THRESHOLD = 250

export function getDefaultSpeedPresets() {
	return [0.25, 0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 16]
}

export function getDefaultSpeedSlider() {
	return { min: 0.5, max: 1.5 }
}

export function getDefaultCinemaInit() {
	return {
		mode: 1,
		color: "#000000",
		colorAlpha: 90,
		rounding: 10,
	} as CinemaInit
}
