import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import test from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const require = createRequire(import.meta.url)
const { produce } = require("immer")

let idCount = 0
const helper = { produce, randomId: () => `id${++idCount}` }
const defaults = { getDefaultEq: () => ({ factor: 1, values: Array(10).fill(0) }), getDefaultState: () => ({ version: 16 }) }

function load(path) {
	const { outputText } = ts.transpileModule(readFileSync(resolve(import.meta.dirname, "../..", path), "utf8"), {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
	})
	const mocks = {
		"@/defaults": defaults,
		"../../defaults": defaults,
		"./helper": helper,
		"../../utils/helper": helper,
	}
	const exports = {}
	// Anything not mocked is only referenced in code these tests don't run.
	runInNewContext(outputText, { exports, require: (name) => mocks[name] ?? {} })
	return exports
}

const { setShortcutEffectValue, getShortcutEffectValue, hasActiveAudioFx, isEffectActive, createAudioEffect, findAudioPreset, AUDIO_EFFECT_PRESETS } =
	load("src/utils/audioFx.ts")
const { migrateContextAudio } = load("src/background/utils/migrateSchema.ts")

const fx = (effects) => ({ pitch: 0, volume: 1, effects })
// Values built inside the sandbox come from another realm, so copy them out before deep comparisons.
const plain = (v) => JSON.parse(JSON.stringify(v))

test("a shortcut adds its effect when missing, then changes the first one", () => {
	let v = setShortcutEffectValue(fx([{ id: "e", type: "eq", enabled: true }]), "delay", 2, false)
	assert.deepEqual(plain(v.effects.map((e) => e.type)), ["eq", "delay"])
	assert.equal(getShortcutEffectValue(v, "delay"), 2)

	// A second delay added by hand is left alone; a disabled first one is turned back on.
	v = produce(v, (d) => {
		d.effects[1].enabled = false
		d.effects.push({ id: "x", type: "delay", enabled: true, delay: 9 })
	})
	v = setShortcutEffectValue(v, "delay", 3, false)
	assert.equal(v.effects[1].delay, 3)
	assert.equal(v.effects[1].enabled, true)
	assert.equal(v.effects[2].delay, 9)
})

test("a delay shortcut reset removes the delay rather than leaving the card's starting value", () => {
	const v = setShortcutEffectValue(fx([{ id: "d", type: "delay", enabled: true, delay: 2 }]), "delay", 0, true)
	assert.deepEqual(plain(v.effects), [])
})

test("a shortcut reset removes the effect", () => {
	const v = setShortcutEffectValue(fx([{ id: "p", type: "pan", enabled: true, pan: 0.4 }]), "pan", 0, true)
	assert.deepEqual(plain(v.effects), [])
	assert.equal(getShortcutEffectValue(v, "pan"), undefined)
})

test("the pan shortcut adds a pan effect and its reset removes it", () => {
	let v = setShortcutEffectValue(fx([{ id: "w", type: "width", enabled: true, width: 2 }]), "pan", -0.5, false)
	assert.deepEqual(plain(v.effects.map((e) => e.type)), ["width", "pan"])
	assert.equal(getShortcutEffectValue(v, "pan"), -0.5)
	v = setShortcutEffectValue(v, "pan", 0, true)
	assert.deepEqual(plain(v.effects.map((e) => e.type)), ["width"])
})

test("only effects that change the audio count as active", () => {
	assert.equal(hasActiveAudioFx(fx([])), false)
	assert.equal(hasActiveAudioFx(fx([{ type: "eq", enabled: true, eq: { factor: 1, values: [0, 0] } }])), false)
	assert.equal(hasActiveAudioFx(fx([{ type: "delay", enabled: false, delay: 2 }])), false)
	assert.equal(hasActiveAudioFx(fx([{ type: "freqFilter", enabled: true, filterType: "lowpass", frequency: 500 }])), true)
	assert.equal(hasActiveAudioFx({ pitch: 2, volume: 1 }), true)
	assert.equal(isEffectActive({ type: "pan", enabled: true, pan: 0 }), false)
	// Types from another version do nothing, so they don't start a capture.
	assert.equal(isEffectActive({ type: "chorus", enabled: true, rate: 1.5 }), false)
})

test("old audio settings migrate into the effect list in chain order", () => {
	const ctx = migrateContextAudio({
		audioFx: { pitch: 1, volume: 1, delay: 0.5, delayMerge: true, eq: { enabled: true, factor: 1, values: [3, 0], name: "Bass" } },
		audioFxAlt: { pitch: 0, volume: 1, delay: 0, eq: { enabled: false, factor: 1, values: [0, 0] } },
		audioPan: -0.5,
	})
	assert.deepEqual(plain(ctx.audioFx.effects.map((e) => e.type)), ["eq", "delay", "pan"])
	assert.deepEqual(plain(ctx.audioFx.effects[0].eq), { factor: 1, values: [3, 0], name: "Bass" })
	assert.equal(ctx.audioFx.effects[1].delayMerge, true)
	assert.equal(ctx.audioFx.effects[2].pan, -0.5)
	assert.equal(ctx.audioFx.eq, undefined)
	assert.equal(ctx.audioFx.delay, undefined)
	assert.equal("audioPan" in ctx, false)
	// A flat, disabled EQ and zero delay leave nothing behind.
	assert.deepEqual(plain(ctx.audioFxAlt.effects), [])
})

test("pan alone creates an audio context, and migrated settings are left as they are", () => {
	assert.deepEqual(plain(migrateContextAudio({ audioPan: 1 }).audioFx.effects.map((e) => e.type)), ["pan"])
	const done = { audioFx: fx([{ id: "a", type: "freqFilter", filterType: "highpass", enabled: true }]) }
	assert.equal(migrateContextAudio(done).audioFx, done.audioFx)
})

test("new effects only count as active when they change the audio", () => {
	for (const type of ["freqFilter", "compressor", "reverb", "modulation", "distortion"]) {
		assert.equal(isEffectActive(createAudioEffect(type)), true, `${type} default is audible`)
	}
	// Pan and width start neutral, matching their shortcut defaults.
	assert.equal(isEffectActive(createAudioEffect("pan")), false)
	assert.equal(isEffectActive(createAudioEffect("width")), false)
	assert.equal(isEffectActive({ type: "width", enabled: true, width: 0 }), true)
	assert.equal(isEffectActive({ type: "reverb", enabled: true, size: 2, mix: 0 }), false)
	// Shelves only change the audio with a gain.
	assert.equal(isEffectActive({ type: "freqFilter", enabled: true, filterType: "lowshelf", frequency: 120, gain: 0 }), false)
	assert.equal(isEffectActive({ type: "freqFilter", enabled: true, filterType: "lowshelf", frequency: 120, gain: 6 }), true)
	// Mix only blends the pitch wobble, so a tremolo still plays at mix 0.
	assert.equal(isEffectActive({ type: "modulation", enabled: true, rate: 5, pitchDepth: 0.5, volumeDepth: 0, mix: 0 }), false)
	assert.equal(isEffectActive({ type: "modulation", enabled: true, rate: 5, pitchDepth: 0, volumeDepth: 0.5, mix: 0 }), true)
	assert.equal(isEffectActive({ type: "distortion", enabled: true, drive: 0, bits: 16, downsample: 1, mix: 1 }), false)
	assert.equal(isEffectActive({ type: "distortion", enabled: true, drive: 0, bits: 8, downsample: 1, mix: 1 }), true)
})

test("every preset is audible and is recognised once applied", () => {
	for (const [type, presets] of Object.entries(AUDIO_EFFECT_PRESETS)) {
		// A new card starts on the first preset, which must be audible rather than subtle.
		assert.equal(findAudioPreset(createAudioEffect(type)), presets[0].id, `${type} starts on its first preset`)
		for (const preset of presets) {
			const effect = { ...createAudioEffect(type), ...preset.values }
			assert.equal(isEffectActive(effect), true, `${type}/${preset.id} is audible`)
			assert.equal(findAudioPreset(effect), preset.id, `${type}/${preset.id} is found`)
		}
	}
	assert.equal(findAudioPreset({ ...createAudioEffect("reverb"), size: 2.6 }), undefined)
})

test("the bit crusher quantizes to its bit depth and holds samples when downsampling", () => {
	const registered = {}
	const { outputText } = ts.transpileModule(readFileSync(resolve(import.meta.dirname, "../../src/offscreen/BitCrusherProcessor.ts"), "utf8"), {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
	})
	runInNewContext(outputText, {
		AudioWorkletProcessor: class {},
		registerProcessor: (name, cls) => (registered[name] = cls),
	})
	const processor = new registered["bit-crusher-processor"]()
	const run = (samples, bits, downsample) => {
		const out = [new Float32Array(samples.length)]
		processor.process([[Float32Array.from(samples)]], [out], { bits: [bits], downsample: [downsample] })
		return Array.from(out[0])
	}
	// 2 bits leave steps of 0.5.
	assert.deepEqual(run([0.1, 0.3, -0.8, 1], 2, 1), [0, 0.5, -1, 1])
	// Downsampling by 2 repeats every other sample; 16 bits is effectively unchanged.
	const held = run([0.1, 0.2, 0.3, 0.4], 16, 2)
	assert.ok(Math.abs(held[0] - 0.1) < 1e-4 && held[1] === held[0])
	assert.ok(Math.abs(held[2] - 0.3) < 1e-4 && held[3] === held[2])
})
