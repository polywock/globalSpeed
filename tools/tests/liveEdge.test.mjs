import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"

function load() {
	const { outputText } = ts.transpileModule(readFileSync(resolve(import.meta.dirname, "../../src/contentScript/isolated/utils/liveEdge.ts"), "utf8"), {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
	})
	const exports = {}
	runInNewContext(outputText, { exports })
	return exports
}

const ranges = (...pairs) => ({ length: pairs.length, start: (i) => pairs[i][0], end: (i) => pairs[i][1] })
const media = (init) => ({ duration: Infinity, currentTime: 0, seekable: ranges(), buffered: ranges(), ...init })

const { getLiveHeadroom, updateLiveLock, getLiveSafeSpeed } = load()

test("headroom is only known for infinite-duration media with ranges", () => {
	assert.equal(getLiveHeadroom(media({ duration: 600, buffered: ranges([0, 50]) })), undefined)
	assert.equal(getLiveHeadroom(media({ currentTime: 10 })), undefined)
	assert.equal(getLiveHeadroom(media({ currentTime: 10, buffered: ranges([0, 12]) })), 2)
	assert.equal(getLiveHeadroom(media({ currentTime: 10, buffered: ranges([0, 5], [8, 12]) })), 2)
	// Seekable is ignored: Twitch reports [0, 2^30] while only a few seconds are downloaded.
	assert.equal(getLiveHeadroom(media({ currentTime: 124, seekable: ranges([0, 1073741824]), buffered: ranges([114, 126]) })), 2)
	assert.equal(getLiveHeadroom(media({ currentTime: 10, seekable: ranges([0, 30]) })), undefined)
})

test("twitch at the live point locks to 1x", () => {
	const m = media({ currentTime: 164.76, seekable: ranges([0, 1073741824]), buffered: ranges([114, 126]) })
	assert.equal(updateLiveLock(m), true)
	assert.equal(getLiveSafeSpeed(m, 2), 1)
})

test("locks at the live point and stays locked while headroom wobbles", () => {
	const m = media({ currentTime: 10, buffered: ranges([0, 20]) })
	assert.equal(updateLiveLock(m), false)
	assert.equal(getLiveSafeSpeed(m, 2), 2) // Behind the live point: catch-up is allowed.
	m.currentTime = 18
	assert.equal(updateLiveLock(m), true)
	assert.equal(getLiveSafeSpeed(m, 2), 1)
	assert.equal(getLiveSafeSpeed(m, 0.5), 0.5)
	m.buffered = ranges([0, 26]) // A new segment arrives.
	assert.equal(updateLiveLock(m), false)
	assert.equal(m.gsLiveLocked, true)
})

test("seeking back or resuming releases the lock, but not within the live window", () => {
	const m = media({ currentTime: 19, buffered: ranges([0, 20]) })
	updateLiveLock(m)
	m.currentTime = 18.5
	assert.equal(updateLiveLock(m, true), false)
	assert.equal(m.gsLiveLocked, true)
	m.currentTime = 5
	assert.equal(updateLiveLock(m, true), true)
	assert.equal(m.gsLiveLocked, undefined)
})

test("unsure or finite media is never locked", () => {
	const m = media({ currentTime: 19, buffered: ranges([0, 20]) })
	updateLiveLock(m)
	m.duration = 3600 // Became a replay.
	assert.equal(updateLiveLock(m), true)
	assert.equal(getLiveSafeSpeed(m, 2), 2)
})
