type PlayerRoot = HTMLElement & { getPlaybackRate?: () => number }
type PlayerCore = { playbackRate: number; getPlaybackRate: () => number; [key: string]: any }
type CueScheduler = { sync: () => void; [key: string]: any }
type CueHook = {
	sourceKey: string
	original: PlayerCore
	proxy: PlayerCore
	video: HTMLVideoElement
	rate: number
}

// YouTube schedules caption (and other cue) boundaries using a cached player
// rate, not video.playbackRate. Its public setter clamps/rounds arbitrary rates.
// Give only the cue scheduler the native rate, preserving the rest of the player.
export class YoutubeCaptions {
	private enabled = false
	private syncing = false
	private hooks = new Map<CueScheduler, CueHook>()
	private registry: object
	private prototype: PlayerCore

	constructor(private getRate: (video: HTMLVideoElement) => number) {}

	update = (enabled: boolean) => {
		if (!enabled) {
			this.release()
			return
		}
		if (!this.enabled) {
			document.addEventListener("play", this.sync, { capture: true, passive: true })
			document.addEventListener("loadedmetadata", this.sync, { capture: true, passive: true })
		}
		this.enabled = true
		this.sync()
	}

	private sync = () => {
		if (!this.enabled || this.syncing) return
		this.syncing = true
		const current = new Set<CueScheduler>()
		try {
			const proto = this.findPrototype()
			if (!proto) return
			for (const root of document.querySelectorAll<PlayerRoot>(".html5-video-player")) {
				let scheduler: CueScheduler
				try {
					const video = root.querySelector("video")
					if (!video || typeof root.getPlaybackRate !== "function") continue
					const core = this.captureCore(root, proto)
					if (!core) continue
					const schedulers = Object.values(core).filter(
						(value) => value && typeof value.sync === "function" && value.sync.toString().includes("getPlaybackRate"),
					)
					if (schedulers.length !== 1) continue
					scheduler = schedulers[0]
					let hook = this.hooks.get(scheduler)
					if (hook && (hook.video !== video || scheduler[hook.sourceKey] !== hook.proxy)) {
						this.unhook(scheduler, hook)
						hook = undefined
					}
					if (!hook) {
						hook = this.hook(scheduler, core, video)
						if (!hook) continue
						this.hooks.set(scheduler, hook)
					}
					current.add(scheduler)
					const rate = this.getRate(video)
					if (rate !== hook.rate) {
						hook.rate = rate
						// Also reschedule when Ghost Mode suppresses ratechange.
						scheduler.sync()
					}
				} catch {
					const hook = this.hooks.get(scheduler)
					if (hook) this.unhook(scheduler, hook)
				}
			}
		} catch {
			// Unknown player builds must not interfere with normal speed control.
		} finally {
			for (const [scheduler, hook] of this.hooks) {
				if (!current.has(scheduler)) this.unhook(scheduler, hook)
			}
			this.syncing = false
		}
	}

	private findPrototype(): PlayerCore | undefined {
		const registry = (window as any)._yt_player
		if (!registry) return
		if (registry === this.registry && this.prototype) return this.prototype
		this.registry = registry
		this.prototype = undefined
		// Exported class/property names are minified per build. Recognize the
		// cached-rate getter, requiring a unique match before touching anything.
		const candidates = Object.values(registry)
			.map((value: any) => value?.prototype)
			.filter((proto) => {
				const getter = Object.getOwnPropertyDescriptor(proto ?? {}, "getPlaybackRate")?.value
				return typeof getter === "function" && /^getPlaybackRate\(\)\{returnthis\.playbackRate;?\}$/.test(getter.toString().replace(/\s/g, ""))
			})
		if (candidates.length === 1) this.prototype = candidates[0]
		return this.prototype
	}

	private captureCore(root: PlayerRoot, proto: PlayerCore): PlayerCore | undefined {
		const descriptor = Object.getOwnPropertyDescriptor(proto, "getPlaybackRate")
		if (typeof descriptor?.value !== "function" || !descriptor.configurable) return
		let core: PlayerCore
		try {
			Object.defineProperty(proto, "getPlaybackRate", {
				...descriptor,
				value: function (this: PlayerCore, ...args: any[]) {
					core = this
					return descriptor.value.apply(this, args)
				},
			})
			root.getPlaybackRate()
		} finally {
			// The probe exists only for this synchronous public API call.
			Object.defineProperty(proto, "getPlaybackRate", descriptor)
		}
		return core
	}

	private hook(scheduler: CueScheduler, core: PlayerCore, video: HTMLVideoElement): CueHook | undefined {
		const keys = Object.keys(scheduler).filter((key) => scheduler[key] === core)
		if (keys.length !== 1) return
		const sourceKey = keys[0]
		const getRate = () => {
			const rate = this.getRate(video)
			return Number.isFinite(rate) && rate > 0 ? rate : core.getPlaybackRate()
		}
		const proxy = new Proxy(core, {
			get(target, key) {
				if (key === "getPlaybackRate") return getRate
				const value = Reflect.get(target, key, target)
				return typeof value === "function" ? value.bind(target) : value
			},
		})
		scheduler[sourceKey] = proxy
		return { sourceKey, original: core, proxy, video, rate: NaN }
	}

	private unhook(scheduler: CueScheduler, hook: CueHook) {
		this.hooks.delete(scheduler)
		try {
			if (scheduler[hook.sourceKey] === hook.proxy) {
				scheduler[hook.sourceKey] = hook.original
				scheduler.sync()
			}
		} catch {}
	}

	release = () => {
		this.enabled = false
		document.removeEventListener("play", this.sync, true)
		document.removeEventListener("loadedmetadata", this.sync, true)
		for (const [scheduler, hook] of this.hooks) this.unhook(scheduler, hook)
	}
}
