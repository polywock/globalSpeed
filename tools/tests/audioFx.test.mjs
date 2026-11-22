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

const { setShortcutEffectValue, getShortcutEffectValue, hasActiveAudioFx, isEffectActive } = load("src/utils/audioFx.ts")
const { migrateContextAudio } = load("src/background/utils/migrateSchema.ts")

const fx = (effects) => ({ pitch: 0, volume: 1, effects })
// Values built inside the sandbox come from another realm, so copy them out before deep comparisons.
const plain = (v) => JSON.parse(JSON.stringify(v))

test("a shortcut adds its effect when missing, then changes the first one", () => {
	let v = setShortcutEffectValue(fx([{ id: "e", type: "eq", enabled: true }]), "delay", 2, false)
	assert.deepEqual(
		plain(v.effects.map((e) => e.type)),
		["eq", "delay"],
	)
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

test("a shortcut reset removes the effect", () => {
	const v = setShortcutEffectValue(fx([{ id: "p", type: "pan", enabled: true, pan: 0.4 }]), "pan", 0, true)
	assert.deepEqual(plain(v.effects), [])
	assert.equal(getShortcutEffectValue(v, "pan"), undefined)
})

test("only effects that change the audio count as active", () => {
	assert.equal(hasActiveAudioFx(fx([])), false)
	assert.equal(hasActiveAudioFx(fx([{ type: "eq", enabled: true, eq: { factor: 1, values: [0, 0] } }])), false)
	assert.equal(hasActiveAudioFx(fx([{ type: "delay", enabled: false, delay: 2 }])), false)
	assert.equal(hasActiveAudioFx(fx([{ type: "lowpass", enabled: true, frequency: 500 }])), true)
	assert.equal(hasActiveAudioFx({ pitch: 2, volume: 1 }), true)
	assert.equal(isEffectActive({ type: "pan", enabled: true, pan: 0 }), false)
})

test("old audio settings migrate into the effect list in chain order", () => {
	const ctx = migrateContextAudio({
		audioFx: { pitch: 1, volume: 1, delay: 0.5, delayMerge: true, eq: { enabled: true, factor: 1, values: [3, 0], name: "Bass" } },
		audioFxAlt: { pitch: 0, volume: 1, delay: 0, eq: { enabled: false, factor: 1, values: [0, 0] } },
		audioPan: -0.5,
	})
	assert.deepEqual(
		plain(ctx.audioFx.effects.map((e) => e.type)),
		["eq", "delay", "pan"],
	)
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
	assert.deepEqual(
		plain(migrateContextAudio({ audioPan: 1 }).audioFx.effects.map((e) => e.type)),
		["pan"],
	)
	const done = { audioFx: fx([{ id: "a", type: "highpass", enabled: true }]) }
	assert.equal(migrateContextAudio(done).audioFx, done.audioFx)
})
