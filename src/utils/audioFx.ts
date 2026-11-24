import { getDefaultEq } from "@/defaults"
import { AudioEffect, AudioEffectType, AudioFx, FrequencyFilterType } from "@/types"
import { produce, randomId } from "./helper"

export const AUDIO_EFFECT_TYPES: AudioEffectType[] = ["eq", "freqFilter", "compressor", "delay", "reverb", "modulation", "distortion", "pan", "width"]

/** Need both channels, so in split mode they run on the combined output instead of a side. */
export const STEREO_EFFECT_TYPES = new Set<AudioEffectType>(["pan", "width"])

/** Settable fields per type, used for resets and default checks. */
export const AUDIO_EFFECT_PARAMS: { [type in AudioEffectType]: (keyof AudioEffect)[] } = {
	eq: ["eq"],
	freqFilter: ["filterType", "frequency", "q", "gain"],
	compressor: ["threshold", "ratio"],
	delay: ["delay", "delayMerge"],
	reverb: ["size", "mix"],
	modulation: ["rate", "pitchDepth", "volumeDepth", "delayTime", "feedback", "mix"],
	distortion: ["drive", "bits", "downsample", "mix"],
	pan: ["pan"],
	width: ["width"],
}

export const FREQUENCY_MIN = 20
export const FREQUENCY_MAX = 20000
export const Q_DEFAULT = 0.707

export const FREQUENCY_FILTER_TYPES: FrequencyFilterType[] = ["lowpass", "highpass", "bandpass", "notch", "lowshelf", "highshelf"]

/** Shelves raise or lower everything past their frequency by a gain, rather than filtering it out. */
export const isShelfFilter = (type: FrequencyFilterType) => type === "lowshelf" || type === "highshelf"

/** Starting values per filter type; switching type loads them, since a low-pass setting means little as a notch. */
export const FILTER_DEFAULTS: { [key in FrequencyFilterType]: { frequency: number; q: number; gain: number } } = {
	// Pass filters start where the change is obvious on any speakers, so adding one is never silent.
	lowpass: { frequency: 1000, q: Q_DEFAULT, gain: 0 },
	highpass: { frequency: 500, q: Q_DEFAULT, gain: 0 },
	bandpass: { frequency: 1500, q: 1, gain: 0 },
	// Mains hum.
	notch: { frequency: 60, q: 10, gain: 0 },
	lowshelf: { frequency: 120, q: Q_DEFAULT, gain: 6 },
	highshelf: { frequency: 6000, q: Q_DEFAULT, gain: 6 },
}

/** Defaults for this effect, following its filter type. */
export function getEffectDefaults(effect: AudioEffect): AudioEffect {
	const defaults = createAudioEffect(effect.type)
	if (effect.type === "freqFilter") Object.assign(defaults, { filterType: effect.filterType ?? "lowpass" }, FILTER_DEFAULTS[effect.filterType ?? "lowpass"])
	return defaults
}

export function createAudioEffect(type: AudioEffectType): AudioEffect {
	const effect: AudioEffect = { id: randomId(), type, enabled: true }
	if (type === "eq") effect.eq = getDefaultEq()
	if (type === "freqFilter") Object.assign(effect, { filterType: "lowpass" }, FILTER_DEFAULTS.lowpass)
	if (type === "delay") effect.delay = 0.5
	// These start on their first preset, which is always a clearly audible one.
	if (type === "compressor" || type === "reverb" || type === "modulation" || type === "distortion") {
		Object.assign(effect, AUDIO_EFFECT_PRESETS[type][0].values)
	}
	// Neutral, matching the shortcut defaults, so a shortcut reset removes the card again.
	if (type === "pan") effect.pan = 0
	if (type === "width") effect.width = 1
	return effect
}

export type AudioPresetId =
	| "muffled"
	| "telephone"
	| "rumbleCut"
	| "hum50"
	| "hum60"
	| "bassBoost"
	| "gentle"
	| "nightMode"
	| "heavy"
	| "room"
	| "hall"
	| "cathedral"
	| "dreamy"
	| "chorus"
	| "vibrato"
	| "tremolo"
	| "wobble"
	| "flanger"
	| "overdrive"
	| "fuzz"
	| "lofi"
	| "eightBit"
	| "radio"

export type AudioPreset = { id: AudioPresetId; values: Partial<AudioEffect> }

/**
 * Starting points per effect. A preset sets only the fields it lists. The first one is where a new card
 * starts, so it must be clearly audible, never a subtle one.
 */
export const AUDIO_EFFECT_PRESETS: { [type in AudioEffectType]?: AudioPreset[] } = {
	freqFilter: [
		{ id: "muffled", values: { filterType: "lowpass", frequency: 1000, q: Q_DEFAULT } },
		// Roughly the 300 Hz to 3.4 kHz band a phone line carries.
		{ id: "telephone", values: { filterType: "bandpass", frequency: 1000, q: 0.5 } },
		{ id: "rumbleCut", values: { filterType: "highpass", frequency: 80, q: Q_DEFAULT } },
		{ id: "hum50", values: { filterType: "notch", frequency: 50, q: 10 } },
		{ id: "hum60", values: { filterType: "notch", frequency: 60, q: 10 } },
		// Below 120 Hz only, so it stays clear of the 250 to 500 Hz range where boosts turn muddy.
		{ id: "bassBoost", values: { filterType: "lowshelf", frequency: 120, gain: 6 } },
	],
	compressor: [
		{ id: "nightMode", values: { threshold: -35, ratio: 6 } },
		{ id: "heavy", values: { threshold: -24, ratio: 20 } },
		{ id: "gentle", values: { threshold: -18, ratio: 2 } },
	],
	reverb: [
		{ id: "hall", values: { size: 2.5, mix: 0.35 } },
		{ id: "cathedral", values: { size: 6, mix: 0.45 } },
		// Reverb only, no dry sound, so everything feels washed out and far away.
		{ id: "dreamy", values: { size: 3, mix: 1 } },
		{ id: "room", values: { size: 0.8, mix: 0.25 } },
	],
	modulation: [
		// Each sets delay time and feedback too, so switching from flanger doesn't keep its short, fed-back delay.
		{ id: "wobble", values: { rate: 3, pitchDepth: 0.3, volumeDepth: 0, delayTime: 20, feedback: 0, mix: 1 } },
		{ id: "vibrato", values: { rate: 5, pitchDepth: 0.15, volumeDepth: 0, delayTime: 20, feedback: 0, mix: 1 } },
		{ id: "tremolo", values: { rate: 5, pitchDepth: 0, volumeDepth: 0.5, delayTime: 20, feedback: 0, mix: 0.5 } },
		// A very short delay sweeping slowly, so its notches glide through the spectrum.
		{ id: "flanger", values: { rate: 0.25, pitchDepth: 0.25, volumeDepth: 0, delayTime: 3, feedback: 0.7, mix: 0.5 } },
		// About a quarter semitone of drift, a subtle classic chorus.
		{ id: "chorus", values: { rate: 1.5, pitchDepth: 0.2, volumeDepth: 0, delayTime: 20, feedback: 0, mix: 0.5 } },
	],
	distortion: [
		{ id: "overdrive", values: { drive: 30, bits: 16, downsample: 1, mix: 1 } },
		{ id: "fuzz", values: { drive: 100, bits: 16, downsample: 1, mix: 1 } },
		{ id: "lofi", values: { drive: 0, bits: 10, downsample: 3, mix: 1 } },
		{ id: "eightBit", values: { drive: 0, bits: 8, downsample: 4, mix: 1 } },
		{ id: "radio", values: { drive: 15, bits: 12, downsample: 2, mix: 1 } },
	],
}

/** The preset the effect's values currently match, if any. */
export function findAudioPreset(effect: AudioEffect): AudioPresetId | undefined {
	const defaults = getEffectDefaults(effect)
	const same = (a: unknown, b: unknown) => (typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 1e-6 : a === b)
	return AUDIO_EFFECT_PRESETS[effect.type]?.find((p) =>
		Object.entries(p.values).every(([k, v]) => same(effect[k as keyof AudioEffect] ?? defaults[k as keyof AudioEffect], v)),
	)?.id
}

/** Whether the effect would change the audio at all. */
export function isEffectActive(effect: AudioEffect) {
	if (!effect?.enabled) return false
	const mix = effect.mix ?? 1
	if (effect.type === "eq") return !!effect.eq?.values.some((v) => v !== 0)
	if (effect.type === "freqFilter" && isShelfFilter(effect.filterType ?? "lowpass")) return !!effect.gain
	if (effect.type === "delay") return effect.delay > 0
	if (effect.type === "reverb") return mix > 0
	// Mix only blends the pitch wobble; the volume wobble applies on its own.
	if (effect.type === "modulation") return ((effect.pitchDepth ?? 0) > 0 && mix > 0) || (effect.volumeDepth ?? 0) > 0
	if (effect.type === "distortion") return mix > 0 && ((effect.drive ?? 0) > 0 || (effect.bits ?? 16) < 16 || (effect.downsample ?? 1) > 1)
	if (effect.type === "pan") return !!effect.pan
	if (effect.type === "width") return (effect.width ?? 1) !== 1
	// Unknown types (from another version) do nothing in the audio chain.
	return AUDIO_EFFECT_TYPES.includes(effect.type)
}

export function hasActiveAudioFx(fx: AudioFx) {
	if (!fx) return false
	return (fx.pitch ?? 0) !== 0 || (fx.volume ?? 1) !== 1 || !!fx.effects?.some(isEffectActive)
}

/** Shortcuts that set one value of an effect in the list, and the effect type that holds it. */
export const SHORTCUT_EFFECTS = {
	delay: "delay",
	pan: "pan",
} satisfies { [key in keyof AudioEffect]?: AudioEffectType }

export type ShortcutEffectKey = keyof typeof SHORTCUT_EFFECTS

/** Shortcuts act on the first effect of their type. */
export function getShortcutEffectValue(fx: AudioFx, key: ShortcutEffectKey): number | undefined {
	return fx?.effects?.find((e) => e.type === SHORTCUT_EFFECTS[key])?.[key]
}

/**
 * Sets the value on the first effect of its type, adding one if needed. Setting the default value removes
 * the effect, so a shortcut's reset leaves the list as if the effect was never added.
 *
 * Builds the effect itself rather than through createAudioEffect, which keeps the presets that come with
 * card defaults out of the background bundle.
 */
export function setShortcutEffectValue(fx: AudioFx, key: ShortcutEffectKey, value: number, isDefault: boolean): AudioFx {
	const type = SHORTCUT_EFFECTS[key]
	return produce(fx, (d) => {
		d.effects = d.effects || []
		let idx = d.effects.findIndex((e) => e.type === type)
		if (isDefault) {
			if (idx >= 0) d.effects.splice(idx, 1)
			return
		}
		if (idx < 0) {
			d.effects.push({ id: randomId(), type, enabled: true })
			idx = d.effects.length - 1
		}
		d.effects[idx].enabled = true
		d.effects[idx][key] = value
	})
}
