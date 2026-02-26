import { useState } from "react"
import { createRoot } from "react-dom/client"
import { FaPowerOff } from "react-icons/fa"
import { useThemeSync } from "@/hooks/useThemeSync"
import { StateView } from "@/types"
import { loadGsm } from "@/utils/gsm"
import { isFirefox, isMobile } from "@/utils/helper"
import { fetchView } from "@/utils/state"
import { AudioPanel } from "notFirefox/popup/AudioPanel"
import { ErrorFallback } from "../comps/ErrorFallback"
import { useStateView } from "../hooks/useStateView"
import { getLatestActiveTabInfo } from "../utils/browserUtils"
import { FxPanel } from "./FxPanel"
import { Header } from "./Header"
import { MainPanel } from "./MainPanel"
import { OrlHeader } from "./OrlHeader"
import "./popup.css"
import { handleFreshState } from "@/utils/configUtils"

declare global {
	interface GlobalVar {
		speedCounterAtLaunch: number
		initialView: StateView
		showShortcutControl: boolean
	}
}

export function App(props: {}) {
	const [panel, setPanel] = useState(0)
	const [view, setView] = useStateView({ superDisable: true, hideGrant: true })
	useThemeSync()

	if (!view) return null

	return view.superDisable ? (
		<div
			id={"SuperDisable"}
			onClick={() => {
				setView({ superDisable: false, enabled: true })
			}}
			onContextMenu={(e) => {
				e.preventDefault()
				setView({ superDisable: false, enabled: true })
			}}
		>
			<FaPowerOff size="1.78rem" />
		</div>
	) : (
		<div id="App" className={isFirefox() ? "firefox" : ""}>
			<OrlHeader />
			<Header panel={panel} setPanel={(v) => setPanel(v)} />
			{panel === 0 && <MainPanel />}
			{panel === 1 && <FxPanel />}
			{panel === 2 && AudioPanel && <AudioPanel />}
		</div>
	)
}

if (isMobile()) document.documentElement.classList.add("mobile")

Promise.all([
	loadGsm().then((gsm) => {
		gvar.gsm = gsm
		document.documentElement.lang = gsm._lang
	}),
	getLatestActiveTabInfo().then((tabInfo) => {
		gvar.tabInfo = tabInfo
		gvar.tabInfo || window.close()
	}),
	loadInitialView(),
	handleFreshState(),
]).then(() => {
	processInitialView()
	const root = createRoot(document.querySelector("#root"))
	root.render(
		<ErrorFallback>
			<App />
		</ErrorFallback>,
	)
	chrome.storage.session?.setAccessLevel?.({ accessLevel: chrome.storage.AccessLevel.TRUSTED_AND_UNTRUSTED_CONTEXTS })
})

async function loadInitialView() {
	gvar.initialView = await fetchView({ pageKeybinds: true })
}

function processInitialView() {
	const view = gvar.initialView
	if (gvar.tabInfo.url && gvar.tabInfo.url.startsWith("http") && view.pageKeybinds?.some((kb) => kb.enabled && kb.key)) {
		gvar.showShortcutControl = true
	}

	delete gvar.initialView
}
