export class CallbackSet<E> {
	private cbs: Set<(e: E) => void> = new Set()
	add = (cb: (e: E) => void, signal?: AbortSignal) => {
		if (signal?.aborted) return
		this.cbs.add(cb)
		signal?.addEventListener("abort", () => this.delete(cb), { once: true })
	}
	delete = (cb: (e: E) => void) => {
		this.cbs.delete(cb)
	}
	forEach = (fn: (cb: (e: E) => void) => void) => {
		this.cbs.forEach(fn)
	}
}

export class EventsListener {
	keyDownCbs = new CallbackSet<KeyboardEvent>()
	keyUpCbs = new CallbackSet<KeyboardEvent>()

	pointerDownCbs = new CallbackSet<PointerEvent>()
	pointerUpCbs = new CallbackSet<PointerEvent>()
	pointerMoveCbs = new CallbackSet<PointerEvent>()

	mouseDownCbs = new CallbackSet<MouseEvent>()
	mouseUpCbs = new CallbackSet<MouseEvent>()
	mouseMoveCbs = new CallbackSet<MouseEvent>()
	clickCbs = new CallbackSet<MouseEvent>()
	dblClickCbs = new CallbackSet<MouseEvent>()

	touchStartCbs = new CallbackSet<TouchEvent>()
	touchEndCbs = new CallbackSet<TouchEvent>()
	touchMoveCbs = new CallbackSet<TouchEvent>()
	contextMenuCbs = new CallbackSet<MouseEvent>()
	fsCbs = new CallbackSet<Event>()
	visibilityCbs = new CallbackSet<Event>()
	blurCbs = new CallbackSet<Event>()

	constructor() {
		this.update()
	}

	update = () => {
		window.addEventListener("keydown", this.handleKeyDown, true)
		window.addEventListener("keyup", this.handleKeyUp, true)
		window.addEventListener("pointerdown", this.handlePointerDown, true)
		window.addEventListener("pointerup", this.handlePointerUp, true)
		window.addEventListener("pointermove", this.handlePointerMove, true)

		window.addEventListener("mousedown", this.handleMouseDown, true)
		window.addEventListener("mouseup", this.handleMouseUp, true)
		window.addEventListener("mousemove", this.handleMouseMove, true)
		window.addEventListener("click", this.handleClick, true)
		window.addEventListener("dblclick", this.handleDblClick, true)

		window.addEventListener("touchstart", this.handleTouchStart, true)
		window.addEventListener("touchend", this.handleTouchEnd, true)
		window.addEventListener("touchmove", this.handleTouchMove, true)
		window.addEventListener("contextmenu", this.handleContextMenu, true)

		window.addEventListener("fullscreenchange", this.handleFullscreen, true)
		window.addEventListener("webkitfullscreenchange", this.handleFullscreen, true)
		window.addEventListener("visibilitychange", this.handleVisibilityChange, true)

		// Non capturing
		window.addEventListener("blur", this.handleBlur)

		// Need for brave.
		window.addEventListener("webkitvisibilitychange", this.handleVisibilityChange, true)
	}
	handleKeyDown = (e: KeyboardEvent) => {
		this.keyDownCbs.forEach((cb) => {
			cb(e)
		})
	}
	handleKeyUp = (e: KeyboardEvent) => {
		this.keyUpCbs.forEach((cb) => {
			cb(e)
		})
	}
	handlePointerDown = (e: PointerEvent) => {
		this.pointerDownCbs.forEach((cb) => {
			cb(e)
		})
	}
	handlePointerUp = (e: PointerEvent) => {
		this.pointerUpCbs.forEach((cb) => {
			cb(e)
		})
	}
	handlePointerMove = (e: PointerEvent) => {
		this.pointerMoveCbs.forEach((cb) => {
			cb(e)
		})
	}
	handleMouseDown = (e: MouseEvent) => {
		this.mouseDownCbs.forEach((cb) => {
			cb(e)
		})
	}
	handleMouseUp = (e: MouseEvent) => {
		this.mouseUpCbs.forEach((cb) => {
			cb(e)
		})
	}
	handleMouseMove = (e: MouseEvent) => {
		this.mouseMoveCbs.forEach((cb) => {
			cb(e)
		})
	}
	handleClick = (e: MouseEvent) => {
		this.clickCbs.forEach((cb) => {
			cb(e)
		})
	}
	handleDblClick = (e: MouseEvent) => {
		this.dblClickCbs.forEach((cb) => {
			cb(e)
		})
	}
	handleTouchStart = (e: TouchEvent) => {
		this.touchStartCbs.forEach((cb) => {
			cb(e)
		})
	}
	handleTouchEnd = (e: TouchEvent) => {
		this.touchEndCbs.forEach((cb) => {
			cb(e)
		})
	}
	handleTouchMove = (e: TouchEvent) => {
		this.touchMoveCbs.forEach((cb) => {
			cb(e)
		})
	}
	handleContextMenu = (e: MouseEvent) => {
		this.contextMenuCbs.forEach((cb) => {
			cb(e)
		})
	}
	handleFullscreen = (e: Event) => {
		// if (gvar.os.nativeFs?.lastRequested && Date.now() < gvar.os.nativeFs.lastRequested + 200) e.stopImmediatePropagation()
		this.fsCbs.forEach((cb) => {
			cb(e)
		})
	}
	handleVisibilityChange = (e: Event) => {
		this.visibilityCbs.forEach((cb) => {
			cb(e)
		})
	}
	handleBlur = (e: Event) => {
		this.blurCbs.forEach((cb) => {
			cb(e)
		})
	}
}
