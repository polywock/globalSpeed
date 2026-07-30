import type { TabInfo } from "../../utils/browserUtils"
import { Overseer } from "./Overseer"
import { IS_REDDIT } from "./utils/isWebsite"

declare global {
	interface GlobalVar {
		tabInfo: TabInfo
		os: Overseer
		fallbackId: number
		ghostMode?: boolean
		isTopFrame?: boolean
		topFrameUrl?: string
	}
}

async function main() {
	if ((globalThis as any).gvar) return
	;(globalThis as any).gvar = gvar
	;(document as any).gvar = gvar
	gvar.isTopFrame = window.self === window.top
	gvar.os = new Overseer()
	gvar.os.init()

	if (IS_REDDIT && gvar.isTopFrame) {
		const countKey = "g:selfPromoCountR"
		const firstKey = "g:selfPromoFirstR"
		chrome.storage.local.get([countKey, firstKey], (items) => {
			chrome.storage.local.set(
				{
					[countKey]: ((items[countKey] as number) || 0) + 1,
					[firstKey]: items[firstKey] || Date.now(),
				},
				() => {},
			)
		})
	}
}

main()
