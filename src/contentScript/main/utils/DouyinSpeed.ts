type DouyinCore = { _media: HTMLMediaElement; playbackRate: number }
type DouyinRoot = HTMLElement & { _player?: { proxy?: { _core?: DouyinCore } } }
type RateLock = {
	getter: () => number
	setter: (value: number) => void
	blockedSetter: (value: number) => void
	ownDescriptor?: PropertyDescriptor
}

// Douyin's WebCodecs player feeds a MediaStream into the video. The video's
// native playbackRate does not control that decoder; its main-world core does.
export class DouyinSpeed {
	private speed: number | null = null
	private locks = new Map<DouyinCore, RateLock>()

	update = (speed: number | null) => {
		if (speed === null) {
			this.release()
			return
		}
		if (!Number.isFinite(speed) || speed < 0.07 || speed > 16) return
		if (this.speed === null) {
			document.addEventListener("play", this.sync, { capture: true, passive: true })
			document.addEventListener("loadedmetadata", this.sync, { capture: true, passive: true })
		}
		this.speed = speed
		this.sync()
	}

	private sync = () => {
		if (this.speed === null) return
		const current = new Set<DouyinCore>()
		for (const root of document.querySelectorAll<DouyinRoot>(".douyin-player")) {
			let core: DouyinCore
			try {
				// _player is a revocable proxy and may already have been destroyed.
				core = root._player?.proxy?._core
				const media = core?._media
				if (!(media instanceof HTMLMediaElement) || !root.contains(media)) continue
				if (typeof MediaStream === "undefined" || !(media.srcObject instanceof MediaStream)) continue
				current.add(core)
				let lock = this.locks.get(core)
				if (!lock) {
					lock = this.lock(core)
					if (!lock) continue
					this.locks.set(core, lock)
				}
				// Use the original setter so our own updates reach the decoder.
				// Avoid emitting another custom ratechange when the rate already matches.
				if (lock.getter.call(core) !== this.speed) lock.setter.call(core, this.speed)
			} catch {
				// An unsupported or destroyed player must not interrupt other players.
				const lock = this.locks.get(core)
				if (lock) this.unlock(core, lock)
			}
		}
		for (const [core, lock] of this.locks) {
			if (!current.has(core)) this.unlock(core, lock)
		}
	}

	private lock(core: DouyinCore): RateLock | undefined {
		const ownDescriptor = Object.getOwnPropertyDescriptor(core, "playbackRate")
		let descriptor = ownDescriptor
		let proto = Object.getPrototypeOf(core)
		while (!descriptor && proto) {
			descriptor = Object.getOwnPropertyDescriptor(proto, "playbackRate")
			proto = Object.getPrototypeOf(proto)
		}
		if (!descriptor?.get || !descriptor.set || (ownDescriptor && !ownDescriptor.configurable)) return
		if (!Number.isFinite(descriptor.get.call(core))) return

		// Keep the real getter: the decoder reads this value on pause/resume.
		// Blocking page setters prevents the UI's >3x ratechange handler resetting
		// the rate to 1x. This custom player event is not covered by ghost mode.
		const blockedSetter = (_value: number) => {}
		Object.defineProperty(core, "playbackRate", {
			configurable: true,
			enumerable: descriptor.enumerable,
			get: descriptor.get,
			set: blockedSetter,
		})
		return { getter: descriptor.get, setter: descriptor.set, blockedSetter, ownDescriptor }
	}

	private unlock(core: DouyinCore, lock: RateLock) {
		try {
			const descriptor = Object.getOwnPropertyDescriptor(core, "playbackRate")
			if (descriptor?.get === lock.getter && descriptor?.set === lock.blockedSetter) {
				if (lock.ownDescriptor) Object.defineProperty(core, "playbackRate", lock.ownDescriptor)
				else delete core.playbackRate
			}
		} catch {}
		this.locks.delete(core)
	}

	release = () => {
		this.speed = null
		document.removeEventListener("play", this.sync, true)
		document.removeEventListener("loadedmetadata", this.sync, true)
		for (const [core, lock] of this.locks) this.unlock(core, lock)
	}
}
