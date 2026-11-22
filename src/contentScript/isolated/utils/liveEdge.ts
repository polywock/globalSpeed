// A live stream (infinite duration, or gsLive from a site adapter) cannot play faster than real time once it runs out of downloaded
// media; speeding up there only stalls. Lock such media to 1x at the live point, leaving the
// chosen speed untouched so catch-up works again after the user seeks back or resumes.
const LIVE_HEADROOM = 3

/** Seconds of downloaded media ahead of the playhead on a live stream, or undefined when unsure. */
export function getLiveHeadroom(elem: HTMLMediaElement): number | undefined {
	// gsLive: site adapters for players that report a finite duration while live (YouTube).
	if (elem.duration !== Infinity && !elem.gsLive) return
	// Not seekable: players can set any live seekable range (Twitch reports [0, 2^30]).
	const ranges = elem.buffered
	if (!ranges?.length) return
	const edge = ranges.end(ranges.length - 1)
	if (!Number.isFinite(edge) || !Number.isFinite(elem.currentTime)) return
	return edge - elem.currentTime
}

/** Updates elem.gsLiveLocked; `canRelease` after the user seeks or resumes. Returns true if it changed. */
export function updateLiveLock(elem: HTMLMediaElement, canRelease = false): boolean {
	const headroom = getLiveHeadroom(elem)
	let locked = !!elem.gsLiveLocked
	if (headroom == null) {
		locked = false
	} else if (headroom < LIVE_HEADROOM) {
		locked = true
	} else if (canRelease) {
		// Not on every tick: arriving segments make headroom wobble while playing at 1x.
		locked = false
	}
	if (locked === !!elem.gsLiveLocked) return false
	locked ? (elem.gsLiveLocked = true) : delete elem.gsLiveLocked
	return true
}

export function getLiveSafeSpeed(elem: HTMLMediaElement, speed: number) {
	return elem.gsLiveLocked && speed > 1 ? 1 : speed
}
