const HOT_ZONE = 20
const MIN_WIDTH = 60
const MIN_HEIGHT = 60

enum Transform {
	X_LEFT = 1,
	X_RIGHT,
	Y_TOP,
	Y_BOTTOM,
	MOVING,
}

export class ScalableDiv {
	width = 500
	height = 350
	x = (window.innerWidth - this.width) / 2 + window.scrollX
	y = (window.innerHeight - this.height) / 2 + window.scrollY

	ref?: {
		x: number
		y: number
		width: number
		height: number
		cursorX: number
		cursorY: number
		transforms: Set<Transform>
	}
	public handleDimChange: () => void
	constructor(public div: HTMLDivElement) {
		this.div.addEventListener("pointerdown", this.handlePointerDown)
		this.sync()
	}
	release = () => {
		this.handlePointerUp()
		this.div.remove()
		this.div.removeEventListener("pointerdown", this.handlePointerDown)
	}
	handlePointerDown = (e: PointerEvent) => {
		if (e.button !== 0) return
		e.stopImmediatePropagation()
		if (this.ref) {
			this.handlePointerUp()
			return
		}
		const transforms = new Set<Transform>()
		if (e.offsetX < HOT_ZONE) {
			transforms.add(Transform.X_LEFT)
		} else if (this.width - e.offsetX < HOT_ZONE) {
			transforms.add(Transform.X_RIGHT)
		}
		if (e.offsetY < HOT_ZONE) {
			transforms.add(Transform.Y_TOP)
		} else if (this.height - e.offsetY < HOT_ZONE) {
			transforms.add(Transform.Y_BOTTOM)
		}

		if (transforms.size === 0) {
			transforms.add(Transform.MOVING)
		}

		this.ref = { x: this.x, y: this.y, width: this.width, height: this.height, cursorX: e.pageX, cursorY: e.pageY, transforms }
		window.addEventListener("pointermove", this.handlePointerMove, { capture: true, passive: true })
		gvar.os.eListen.pointerUpCbs.add(this.handlePointerUp)
	}
	handlePointerUp = () => {
		delete this.ref
		window.removeEventListener("pointermove", this.handlePointerMove, true)
		gvar.os.eListen.pointerUpCbs.delete(this.handlePointerUp)
	}
	handlePointerMove = (e: MouseEvent) => {
		if (!this.ref) {
			this.handlePointerUp()
			return
		}

		var newDims = {
			x: this.x,
			y: this.y,
			width: this.width,
			height: this.height,
		}

		const deltaX = e.pageX - this.ref.cursorX
		const deltaY = e.pageY - this.ref.cursorY

		if (this.ref.transforms.has(Transform.X_LEFT)) {
			newDims.width = Math.max(this.ref.width - deltaX, MIN_WIDTH)
			newDims.x = this.ref.x - (newDims.width - this.ref.width)
		} else if (this.ref.transforms.has(Transform.X_RIGHT)) {
			newDims.width = this.ref.width + deltaX
		}
		if (this.ref.transforms.has(Transform.Y_TOP)) {
			newDims.height = Math.max(this.ref.height - deltaY, MIN_HEIGHT)
			newDims.y = this.ref.y - (newDims.height - this.ref.height)
		} else if (this.ref.transforms.has(Transform.Y_BOTTOM)) {
			newDims.height = this.ref.height + (e.pageY - this.ref.cursorY)
		}
		if (this.ref.transforms.has(Transform.MOVING)) {
			newDims.x = this.ref.x + deltaX
			newDims.y = this.ref.y + deltaY
		}

		this.width = Math.max(MIN_WIDTH, newDims.width)
		this.height = Math.max(MIN_HEIGHT, newDims.height)
		this.x = newDims.x // Math.max(0, newDims.x)
		this.y = newDims.y // Math.max(0, newDims.y)

		this.sync()
	}

	sync() {
		this.div.style.width = `${this.width}px`
		this.div.style.height = `${this.height}px`
		this.div.style.position = "absolute"
		this.div.style.left = `${this.x}px`
		this.div.style.top = `${this.y}px`
		this.div.style.zIndex = "99999999999"
		this.div.style.userSelect = "none"
	}
}
