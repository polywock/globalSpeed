import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"

function load(path, globals = {}) {
	const { outputText } = ts.transpileModule(readFileSync(resolve(import.meta.dirname, "../..", path), "utf8"), {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
	})
	const exports = {}
	runInNewContext(outputText, { exports, ...globals })
	return exports
}

function youtubeEnv() {
	const listeners = new Map()
	const video = {}
	const player = { live: false, getVideoData() { return { isLive: this.live } }, querySelector: () => video }
	const document = {
		getElementById: (id) => (id === "movie_player" ? player : null),
		addEventListener: (type, cb) => listeners.set(type, cb),
		removeEventListener: (type) => listeners.delete(type),
	}
	const reports = []
	const { YoutubeLive } = load("src/contentScript/main/utils/YoutubeLive.ts", { document })
	const live = new YoutubeLive((value) => reports.push(value))
	const fire = (type, target = video) => listeners.get(type)?.({ target })
	return { live, player, video, reports, fire, listeners }
}

test("reports only changes of the main player's live state", () => {
	const env = youtubeEnv()
	env.live.update(true)
	env.fire("timeupdate")
	assert.deepEqual(env.reports, [])
	env.player.live = true
	env.fire("timeupdate")
	env.fire("timeupdate")
	env.fire("timeupdate", {}) // Another video on the page is ignored.
	assert.deepEqual(env.reports, [true])
	env.player.live = false
	env.fire("timeupdate")
	assert.deepEqual(env.reports, [true, false])
})

test("reports again for a new source and clears when disabled", () => {
	const env = youtubeEnv()
	env.live.update(true)
	env.player.live = true
	env.fire("timeupdate")
	env.fire("emptied") // The isolated world dropped its flag for the new video.
	env.fire("timeupdate")
	assert.deepEqual(env.reports, [true, true])
	env.live.update(false)
	assert.deepEqual(env.reports, [true, true, false])
	assert.equal(env.listeners.size, 0)
})

test("a player without the API or one that throws is never live", () => {
	const env = youtubeEnv()
	env.live.update(true)
	env.player.getVideoData = () => {
		throw new Error("changed build")
	}
	env.fire("timeupdate")
	env.player.getVideoData = () => undefined
	env.fire("timeupdate")
	delete env.player.getVideoData
	env.fire("timeupdate")
	assert.deepEqual(env.reports, [])
})

test("a live YouTube video gets the buffered-media lock despite its finite duration", () => {
	const { updateLiveLock, getLiveSafeSpeed } = load("src/contentScript/isolated/utils/liveEdge.ts")
	// Sampled from a YouTube live stream stalling at 4x.
	const buffered = { length: 1, end: () => 18554.6 }
	const m = { duration: 22129.6, currentTime: 18554.21, buffered }
	assert.equal(updateLiveLock(m), false)
	assert.equal(getLiveSafeSpeed(m, 4), 4)
	m.gsLive = true
	assert.equal(updateLiveLock(m), true)
	assert.equal(getLiveSafeSpeed(m, 4), 1)
	assert.equal(getLiveSafeSpeed(m, 0.5), 0.5)
	delete m.gsLive
	assert.equal(updateLiveLock(m), true)
	assert.equal(getLiveSafeSpeed(m, 4), 4)
})
