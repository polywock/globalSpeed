import { getDefaultAudioFx, getDefaultFx } from "@/defaults"
import type { CommandName } from "@/defaults/commands"
import { filterInfos } from "@/defaults/filters"
import { Keybind, ReferenceValues, StateView, StateViewSelector } from "@/types"

export const afxContinuousMap: { [key: string]: "pitch" | "volume" | "delay" } = {
	afxPitch: "pitch",
	afxGain: "volume",
	afxDelay: "delay",
}

/**
 * What each command's value is read from. A command is in here exactly when its value
 * lives in storage, which is also what decides whether it can have a slider at all.
 */
const itcSelectors: { [key in CommandName]?: StateViewSelector } = {
	speed: { speed: true },
	fxFilter: { elementFx: true, backdropFx: true },
	afxPan: { audioPan: true },
	afxGain: { audioFx: true, audioFxAlt: true },
	afxPitch: { audioFx: true, audioFxAlt: true },
	afxDelay: { audioFx: true, audioFxAlt: true },
}

export function getItcSelector(kb: Keybind): StateViewSelector {
	return itcSelectors[kb.command] ?? {}
}

/** Whether a slider can track this command, so nothing has to be flagged by hand. */
export function supportsItc(command: CommandName) {
	return !!itcSelectors[command]
}

/** Main is the element/primary value, secondary the backdrop/alt one when it exists. */
export function getItcValues(kb: Keybind, view: StateView, ref?: ReferenceValues): { main?: number; secondary?: number } {
	if (kb.command === "speed") {
		return { main: view.speed }
	} else if (kb.command === "fxFilter") {
		const info = filterInfos[kb.filterOption]
		if (!info) return {}
		const star = info.isTransform ? "transforms" : "filters"
		return {
			main: (view.elementFx || getDefaultFx())[star].find((f) => f.name === kb.filterOption)?.value,
			secondary: (view.backdropFx || getDefaultFx())[star].find((f) => f.name === kb.filterOption)?.value,
		}
	} else if (kb.command === "afxPan") {
		return { main: view.audioPan ?? ref?.default }
	} else if (afxContinuousMap[kb.command]) {
		const key = afxContinuousMap[kb.command]
		return {
			main: (view.audioFx ?? getDefaultAudioFx())[key] ?? ref?.default,
			secondary: view.audioFxAlt ? (view.audioFxAlt[key] ?? ref?.default) : undefined,
		}
	}
	return {}
}
