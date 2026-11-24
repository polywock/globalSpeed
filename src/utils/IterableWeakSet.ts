export class IterableWeakSet<T extends WeakKey> {
	private refs = new Set<WeakRef<T>>()
	private alive = new WeakSet<T>()

	add(value: T) {
		if (this.alive.has(value)) return
		this.alive.add(value)
		this.refs.add(new WeakRef(value))
	}

	has(value: T) {
		return this.alive.has(value)
	}

	/** Whether no value is still alive. */
	isEmpty() {
		for (const _ of this) return false
		return true
	}

	forEach(cb: (value: T) => void) {
		this.refs.forEach((ref) => {
			const v = ref.deref()
			if (v) cb(v)
			else this.refs.delete(ref)
		})
	}

	*[Symbol.iterator]() {
		for (const ref of this.refs) {
			const v = ref.deref()
			if (v) yield v
			else this.refs.delete(ref)
		}
	}
}
