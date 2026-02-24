import { Root, createRoot } from "react-dom/client"
import { SectionFlags } from "./SectionFlags"
import { SectionEditor } from "./SectionEditor"
import { SectionHelp } from "./SectionHelp"
import { SectionRules } from "./SectionRules"
import { ErrorFallback } from "../comps/ErrorFallback"
import { useThemeSync } from "@/hooks/useThemeSync"
import { loadGsm } from "@/utils/gsm"
import { requestTabInfo } from "@/utils/browserUtils"
import type { Indicator } from "@/contentScript/isolated/utils/Indicator"
import { isMac, isMobile } from "@/utils/helper"
import "./options.css"

declare global {
	interface Window {
		root?: Root
	}

	interface GlobalVar {
		indicator?: Indicator
		isOptionsPage?: boolean
	}
}

const Options = (props: {}) => {
	useThemeSync()
	return (
		<div id="App">
			<SectionFlags />
			<SectionEditor />
			{!(isMac() && isMobile()) && <SectionRules />}
			<SectionHelp />
		</div>
	)
}

if (isMobile()) document.documentElement.classList.add("mobile")
Promise.all([loadGsm(), requestTabInfo()]).then(([gsm, tabInfo]) => {
	gvar.isOptionsPage = true
	gvar.gsm = gsm
	gvar.tabInfo = tabInfo
	document.documentElement.lang = gsm._lang
	if (gsm._rtl) document.documentElement.classList.add("rtl")
	window.root = createRoot(document.querySelector("#root"))
	window.root.render(
		<ErrorFallback>
			<Options />
		</ErrorFallback>,
	)
})
