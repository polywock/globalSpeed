import { MouseEvent, useEffect, useRef, useState } from "react"
import { MdContentCopy, MdContentPaste } from "react-icons/md"
import { migrateSchema } from "@/background/utils/migrateSchema"
import { Tooltip } from "@/comps/Tooltip"
import { Button } from "@/comps/ui/button"
import { getDefaultState } from "@/defaults"
import { gvar } from "@/globalVar"
import { State } from "../types"
import { requestCreateTab } from "../utils/browserUtils"
import { IS_FIREFOX_BUILD } from "../utils/buildFlags"
import { areYouSure, isMobile } from "../utils/helper"
import { isPromoLanguage } from "../utils/promoUtils"
import { dumpConfig, fetchView, pushView, restoreConfig } from "../utils/state"
import { OptionsSection } from "./OptionsSection"

export function SectionHelp(props: {}) {
	return (
		<OptionsSection>
			{/* Header */}
			<h2 onClick={handleSecretMenu}>{gvar.gsm.options.help.header}</h2>

			{/* Issue prompt */}
			<div className="mb-7.5 inline-block rounded-lg border border-border bg-card p-2.5 text-lg leading-[2] text-card-foreground opacity-65 hover:opacity-100">
				{gvar.gsm.options.help.issuePrompt} <a href="https://github.com/polywock/globalSpeed/issues">{gvar.gsm.options.help.issueDirective}</a>
			</div>

			<div className="grid grid-cols-[max-content_max-content_1fr] justify-items-end gap-x-2.5">
				{/* Reset  */}
				<Button
					size="xl"
					onClick={async (e) => {
						if (!areYouSure()) return

						window.root.unmount()
						await chrome.storage.local.clear()
						await restoreConfig(getDefaultState(), false)
						window.location.reload()
					}}
				>
					{gvar.gsm.token.reset}
				</Button>

				{/* Export/Import  */}
				{!isMobile() && (
					<>
						<Button
							size="xl"
							className="uppercase"
							onClick={(e) => {
								requestCreateTab(chrome.runtime.getURL("./faqs.html"))
							}}
						>
							{"FAQ"}
						</Button>
						<div className="grid grid-cols-[repeat(4,max-content)] gap-x-1.25">
							<ExportImport />
						</div>
					</>
				)}
			</div>
		</OptionsSection>
	)
}

let helpClicked = 0

function handleSecretMenu(e: MouseEvent) {
	helpClicked++
	if (helpClicked >= 10) {
		const command = prompt("Command? ")?.toLowerCase()
		if (!command) {
			return
		} else if (command === "toggle url banner") {
			fetchView({ hideOrlBanner: true }).then((view) => {
				if (confirm(`Do you want to ${view.hideOrlBanner ? "show" : "hide"} the URL banner? `)) {
					pushView({ override: { hideOrlBanner: !view.hideOrlBanner } })
				}
			})
		} else if (command === "toggle pip priority") {
			fetchView({ ignorePiP: true }).then((view) => {
				if (confirm(`Do you want to ${view.ignorePiP ? "" : "de"}prioritize PiP videos? `)) {
					pushView({ override: { ignorePiP: !view.ignorePiP } })
				}
			})
		} else if (command === "promos") {
			primePromos()
		} else {
			alert("Invalid command.")
		}
	}
}

/** Passes every promo gate, drops the cached config, then refetches it. */
async function primePromos() {
	if (!isPromoLanguage()) {
		return
	}

	await pushView({
		override: {
			selfPromoCountR: 999,
			selfPromoFirstR: Date.now() - 30 * 24 * 36e5,
			selfPromoHideTsR: 0,
			selfPromoData: null,
		},
	})

	await chrome.runtime.sendMessage({ type: "HANDLE_PROMO" } as Messages)
}

function ExportImport(props: {}) {
	const ref = useRef({} as { input?: HTMLInputElement })
	const [showWasCopied, setShowWasCopied] = useState(false)

	useEffect(() => {
		const input = document.createElement("input")
		ref.current.input = input
		input.type = "file"
		input.accept = ".json"
		input.setAttribute("style", `position: fixed; left: -1000px; top: -1000px; opacity: 0;`)
		document.documentElement.appendChild(input)

		const handleChange = (e: Event) => {
			if (!input.files[0]) return
			loadStateFromFile(input.files[0])
		}

		input.addEventListener("change", handleChange)
		return () => {
			input.removeEventListener("change", handleChange)
			input.remove()
		}
	}, [])

	return (
		<>
			<Tooltip title={gvar.gsm.options.help.exportTooltip}>
				<Button
					size="xl"
					onClick={async () => {
						downloadState(await dumpConfig())
					}}
				>
					{gvar.gsm.options.help.export}
				</Button>
			</Tooltip>
			<Tooltip title={showWasCopied ? gvar.gsm.options.help.copied : gvar.gsm.options.help.copy}>
				<Button
					size="xl"
					onClick={async (e) => {
						await navigator.clipboard.writeText(JSON.stringify(await dumpConfig()))
						setShowWasCopied(true)
						setTimeout(() => setShowWasCopied(false), 1000)
					}}
				>
					<MdContentCopy className="pointer-events-none" />
				</Button>
			</Tooltip>
			<Tooltip title={gvar.gsm.options.help.importTooltip}>
				<Button
					size="xl"
					className="ml-3.75"
					onClick={(e) => {
						ref.current.input.click()
					}}
				>
					{gvar.gsm.options.help.import}
				</Button>
			</Tooltip>
			<Tooltip title={gvar.gsm.options.help.paste}>
				<Button
					size="xl"
					onClick={async (e) => {
						if (IS_FIREFOX_BUILD) {
							if (!(await chrome.permissions.request({ permissions: ["clipboardRead", "clipboardWrite"] }))) return
						}

						loadState(await navigator.clipboard.readText())
					}}
				>
					<MdContentPaste />
				</Button>
			</Tooltip>
		</>
	)
}

export function downloadState(state: State) {
	const a = document.createElement("a")
	a.setAttribute("href", window.URL.createObjectURL(new Blob([JSON.stringify(state)], { type: "application/json" })))
	a.setAttribute("download", `Global Speed - ${new Date().toDateString()}.json`)
	a.setAttribute("style", "position: fixed; left: -1000px; top: 1000px; opacity: 0;")
	document.documentElement.append(a)
	a.click()
	a.remove()
}

function readFile(file: File, cb: (result: string) => void) {
	const fileReader = new FileReader()
	fileReader.addEventListener("load", () => {
		if (fileReader.result) {
			cb(fileReader.result as string)
		}
	})
	fileReader.readAsText(file)
}

function loadStateFromFile(file: File) {
	try {
		readFile(file, (result) => {
			if (!result) return
			loadState(result)
		})
	} catch (err) {}
}

async function loadState(text: string) {
	if (!areYouSure()) return
	await restoreConfig(migrateSchema(JSON.parse(text)))
	window.location.reload()
}
