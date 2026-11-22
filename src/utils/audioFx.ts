import { getDefaultEq } from "@/defaults"
import { AudioEffect, AudioEffectType, AudioFx } from "@/types"
import { produce, randomId } from "./helper"

export const AUDIO_EFFECT_TYPES: AudioEffectType[] = ["eq", "lowpass", "highpass", "delay", "pan"]

export const FREQUENCY_MIN = 20
export const FREQUENCY_MAX = 20000
export const Q_DEFAULT = 0.707

export function createAudioEffect(type: AudioEffectType): AudioEffect {
	const effect: AudioEffect = { id: randomId(), type, enabled: true }
	if (type === "eq") effect.eq = getDefaultEq()
	if (type === "lowpass") (effect.frequency = 8000), (effect.q = Q_DEFAULT)
	if (type === "highpass") (effect.frequency = 120), (effect.q = Q_DEFAULT)
	if (type === "delay") effect.delay = 0.5
	if (type === "pan") effect.pan = 0
	return effect
}

/** Whether the effect would change the audio at all. */
export function isEffectActive(effect: AudioEffect) {
	if (!effect?.enabled) return false
	if (effect.type === "eq") return !!effect.eq?.values.some((v) => v !== 0)
	if (effect.type === "delay") return effect.delay > 0
	if (effect.type === "pan") return !!effect.pan
	return true
}

export function hasActiveAudioFx(fx: AudioFx) {
	if (!fx) return false
	return (fx.pitch ?? 0) !== 0 || (fx.volume ?? 1) !== 1 || !!fx.effects?.some(isEffectActive)
}

export type ShortcutEffectType = "delay" | "pan"

/** Shortcuts act on the first effect of their type. */
export function getShortcutEffectValue(fx: AudioFx, type: ShortcutEffectType): number | undefined {
	return fx?.effects?.find((e) => e.type === type)?.[type]
}

/**
 * Sets the first effect of the type, adding one if needed. Setting the default value removes it,
 * so a shortcut's reset leaves the list as if the effect was never added.
 */
export function setShortcutEffectValue(fx: AudioFx, type: ShortcutEffectType, value: number, isDefault: boolean): AudioFx {
	return produce(fx, (d) => {
		d.effects = d.effects || []
		let idx = d.effects.findIndex((e) => e.type === type)
		if (isDefault) {
			if (idx >= 0) d.effects.splice(idx, 1)
			return
		}
		if (idx < 0) {
			d.effects.push(createAudioEffect(type))
			idx = d.effects.length - 1
		}
		d.effects[idx].enabled = true
		d.effects[idx][type] = value
	})
}
