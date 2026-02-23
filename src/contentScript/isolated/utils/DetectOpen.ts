import { randomId } from "@/utils/helper"

export class DetectOpen {
	eventFlag = false
	eventName = randomId()
	cbs = new Set() as Set<() => void>
	constructor() {
		document.addEventListener(this.eventName, this.handleEvent, { capture: true })
		this.mo.observe(document, { childList: true })
	}
	handleEvent = (e: Event) => {
		e.stopImmediatePropagation()
		this.eventFlag = true
	}
	handleMut = (muts: MutationRecord[]): void => {
		if (
			muts.some((mut) => {
				for (let r of mut.removedNodes) {
					if (r.nodeName === "HTML") return true
				}
			})
		) {
			document.dispatchEvent(new Event(this.eventName))
			const flag = this.eventFlag
			this.eventFlag = false

			if (!flag) {
				document.addEventListener(this.eventName, this.handleEvent, { capture: true })
				this.cbs.forEach((cb) => cb())
			}
		}
	}
	mo = new MutationObserver(this.handleMut)
}
