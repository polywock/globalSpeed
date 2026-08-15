import { createRoot, Root } from "react-dom/client"
import type { Indicator } from "@/contentScript/isolated/utils/Indicator"
import { gvar } from "@/globalVar"
import { useThemeSync } from "@/hooks/useThemeSync"
import "@/main.css"
import { requestTabInfo } from "@/utils/browserUtils"
import { handleFreshState } from "@/utils/configUtils"
import { loadGsm } from "@/utils/gsm"
import { Gsm } from "@/utils/GsmType"
import { isMac, isMobile } from "@/utils/helper"
import { SubscribeView } from "@/utils/state"
import { ErrorFallback } from "../comps/ErrorFallback"
import { SectionEditor } from "./SectionEditor"
import { SectionFlags } from "./SectionFlags"
import { SectionHelp } from "./SectionHelp"
import { SectionRules } from "./SectionRules"
import "@fontsource-variable/montserrat/wght.css"

declare global {
	interface Window {
		root?: Root
	}

	interface GlobalVar {
		gsm: Gsm
		indicator?: Indicator
		isOptionsPage?: boolean
		subscribeLanguage?: SubscribeView
	}
}

const Options = (props: { gsm: Gsm }) => {
	useThemeSync()
	return (
		<div id="App" className="mt-10 w-[950px]">
			<SectionFlags />
			<SectionEditor />
			{!(isMac() && isMobile()) && <SectionRules />}
			<SectionHelp />
		</div>
	)
}

if (isMobile()) document.documentElement.classList.add("mobile")
Promise.all([loadGsm(), requestTabInfo(), handleFreshState()]).then(([gsm, tabInfo]) => {
	gvar.isOptionsPage = true
	gvar.tabInfo = tabInfo
	window.root = createRoot(document.querySelector("#root"))
	gvar.subscribeLanguage = new SubscribeView({ language: true }, gvar.tabInfo?.tabId, false, async () => {
		const gsm = await loadGsm()
		loadReact(gsm)
	})
	loadReact(gsm)
})

function loadReact(gsm: Gsm) {
	gvar.gsm = gsm
	document.documentElement.lang = gsm._lang

	window.root.render(
		<ErrorFallback>
			<Options gsm={gsm} />
		</ErrorFallback>,
	)
}
