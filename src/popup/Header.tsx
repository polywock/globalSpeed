import { ComponentPropsWithRef, useMemo } from "react"
import { FaGithub, FaPowerOff, FaVolumeUp } from "react-icons/fa"
import { FaCircleDot } from "react-icons/fa6"
import { GoArrowLeft } from "react-icons/go"
import { IoIosInformationCircle } from "react-icons/io"
import { releaseTabCapture } from "@/background/utils/tabCapture"
import { Gear, Pin, Zap } from "@/comps/svgs"
import { Tooltip } from "@/comps/Tooltip"
import { gvar } from "@/globalVar"
import { KebabList, KebabListProps } from "@/options/KebabList"
import { AnyDict, ORL_CONTEXT_KEYS, StateView } from "@/types"
import { cn, feedbackText, isMobile, produce, replaceArgs } from "@/utils/helper"
import { pushView } from "@/utils/state"
import { getDefaultFx, getDefaultURLCondition, getDefaultURLConditionPart } from "../defaults"
import { useCaptureStatus } from "../hooks/useCaptureStatus"
import { SetView, useStateView } from "../hooks/useStateView"
import { checkFilterDeviation, checkFilterDeviationOrActiveSvg, getActiveParts, requestSyncContextMenu, testURLWithPart } from "../utils/configUtils"

const SUPPORTS_TAB_CAPTURE = !!(chrome.tabCapture?.capture && chrome.offscreen?.createDocument)

type HeaderProps = {
	panel: number
	setPanel: (newPanel: number) => void
}

type HeaderActionProps = ComponentPropsWithRef<"div"> & {
	active?: boolean
	beat?: boolean
	muted?: boolean
	unpadded?: boolean
}

function HeaderAction({ active, beat, className, muted, unpadded, ...props }: HeaderActionProps) {
	return (
		<div
			{...props}
			className={cn(
				"cursor-pointer px-1.25 text-secondary-foreground icon-owner hover:opacity-90 [&>svg]:align-baseline",
				active && "text-primary",
				muted && "text-muted-foreground",
				active && beat && "animate-[beat_1s_ease-in_infinite]",
				unpadded && "px-0",
				className,
			)}
		/>
	)
}

export function Header(props: HeaderProps) {
	const [view, setView] = useStateView({
		enabled: true,
		isPinned: true,
		superDisable: true,
		circleWidget: true,
		keybindsUrlCondition: true,
		sawEnableShortcutOverlayCount: true,
	})

	let kebabInfo: {
		list: KebabListProps["list"]
		onSelect: (name: string) => void
		showAlert: boolean
	} = useMemo(() => {
		return getKebabList(view, setView)
	}, [!!view, view?.keybindsUrlCondition, view?.circleWidget])

	if (!view) return <div></div>

	const clearPin = async (e?: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		e?.preventDefault()
		if (e && !view.isPinned) return
		// If pinning, assume user wants the Orl overrides.
		let orlTransfer: AnyDict = {}
		if (!view.isPinned) {
			const incipit = `r:${gvar.tabInfo.tabId}:`
			const raw = await chrome.storage.local.get(ORL_CONTEXT_KEYS.map((k) => incipit.concat(k)))
			const entries = Object.entries(raw)
				.map(([k, v]) => [k.slice(incipit.length), v])
				.filter(([k, v]) => v != null)
			if (entries.length) {
				orlTransfer = Object.fromEntries(entries)
			}
		}
		setView({ ...orlTransfer, isPinned: !view.isPinned })
	}

	return (
		<div className="grid grid-cols-[repeat(3,max-content)_1fr_repeat(5,max-content)] items-center justify-items-end border-b border-border bg-background px-1.25 pt-0.75">
			{/* Status */}
			<Tooltip title={view.enabled ? gvar.gsm.token.off : gvar.gsm.token.on} align="bottom">
				<HeaderAction
					active={view.enabled}
					muted={!view.enabled}
					onClick={() => {
						setView({ enabled: !view.enabled, latestViaShortcut: false })
					}}
					onContextMenu={(e) => {
						e.preventDefault()
						setView({ superDisable: true })
						requestSyncContextMenu()
					}}
				>
					<FaPowerOff size="1.21rem" />
				</HeaderAction>
			</Tooltip>

			{/* Pin */}
			<Tooltip title={gvar.gsm.header.pinTooltip} align="bottom">
				<HeaderAction active={view.isPinned} muted={!view.isPinned} onClick={() => clearPin()} onContextMenu={(e) => clearPin(e)}>
					<Pin size="1.42rem" />
				</HeaderAction>
			</Tooltip>

			{/* Kebab list */}
			{kebabInfo?.list.length > 0 ? (
				<HeaderAction className="relative -mt-0.75 -ml-1.25 pl-0.5 leading-0">
					<KebabList
						buttonClassName="-mt-0.75 pl-0.5 leading-0"
						centered={true}
						tooltipAlign="bottom"
						list={kebabInfo.list}
						onSelect={kebabInfo.onSelect}
						onOpen={() => {
							kebabInfo.showAlert &&
								(view.sawEnableShortcutOverlayCount || 0) < 5 &&
								setTimeout(showOverlayForKebab.bind(null, view.sawEnableShortcutOverlayCount), 0)
						}}
					/>
					{kebabInfo.showAlert && (
						<div className="pointer-events-none absolute -top-1.5 -right-1.25 text-primary">
							<IoIosInformationCircle size={"1.2em"} />
						</div>
					)}
				</HeaderAction>
			) : (
				<HeaderAction unpadded />
			)}

			{/* Circle gesture */}
			{props.panel === 0 && isMobile() ? <CircleIcon active={view.circleWidget} onClick={() => {}} /> : <HeaderAction unpadded />}

			{/* Audio FX */}
			{props.panel === 0 && SUPPORTS_TAB_CAPTURE ? <AudioIcon onClick={() => props.setPanel(2)} /> : <HeaderAction unpadded />}

			{/* FX */}
			{props.panel === 0 ? <FxIcon enabled={view?.enabled} onClick={() => props.setPanel(1)} /> : <HeaderAction unpadded />}

			{/* Back button */}
			{props.panel !== 0 ? (
				<Tooltip title={gvar.gsm.token.back} align="bottom">
					<HeaderAction onClick={(e) => props.setPanel(0)}>
						<GoArrowLeft size="1.42rem" />
					</HeaderAction>
				</Tooltip>
			) : (
				<HeaderAction unpadded />
			)}

			{/* Options page */}
			<Tooltip title={gvar.gsm.header.settingsPage} align="bottom">
				<HeaderAction
					onClick={async (e) => {
						chrome.tabs.create({ url: chrome.runtime.getURL("options.html") })
						window.close()
					}}
				>
					<Gear size="1.42rem" />
				</HeaderAction>
			</Tooltip>

			{/* Github */}
			<Tooltip title={gvar.gsm.header.github} align="bottom">
				<HeaderAction
					onClick={(e) => {
						chrome.tabs.create({ url: "https://github.com/polywock/globalSpeed" })
						window.close()
					}}
				>
					<FaGithub size="1.28rem" />
				</HeaderAction>
			</Tooltip>
		</div>
	)
}

type FxIconProps = {
	onClick: () => void
	enabled: boolean
}

export function FxIcon(props: FxIconProps) {
	const [view, setView] = useStateView({ elementFx: true, backdropFx: true })

	const fxActive = useMemo(() => {
		if (view && props.enabled) {
			if (
				view.backdropFx?.enabled &&
				(checkFilterDeviationOrActiveSvg(view.backdropFx.filters, view.backdropFx.svgFilters) || checkFilterDeviation(view.backdropFx.transforms))
			)
				return true
			if (
				view.elementFx?.enabled &&
				(checkFilterDeviationOrActiveSvg(view.elementFx.filters, view.elementFx.svgFilters) || checkFilterDeviation(view.elementFx.transforms))
			)
				return true
		}
		return false
	}, [props.enabled, view])

	return (
		<Tooltip title={gvar.gsm.header.videoEffects} align="bottom">
			<HeaderAction
				active={fxActive}
				beat
				onClick={(e) => props.onClick()}
				onContextMenu={(e) => {
					e.preventDefault()
					setView({ elementFx: getDefaultFx(), backdropFx: getDefaultFx() })
				}}
			>
				<Zap size="1.42rem" />
			</HeaderAction>
		</Tooltip>
	)
}

type AudioIconProps = {
	onClick: () => void
}

export function AudioIcon(props: AudioIconProps) {
	const status = useCaptureStatus()
	return (
		<Tooltip title={gvar.gsm.header.audioEffects} align="bottom">
			<HeaderAction
				active={!!status}
				beat
				onClick={props.onClick}
				onContextMenu={(e) => {
					e.preventDefault()
					releaseTabCapture(gvar.tabInfo.tabId)
					pushView({
						override: {
							audioFx: null,
							audioFxAlt: null,
							audioPan: null,
						},
						tabId: gvar.tabInfo.tabId,
					})
				}}
			>
				<FaVolumeUp size="1.2rem" />
			</HeaderAction>
		</Tooltip>
	)
}

type CircleIconProps = {
	onClick: () => void
	active?: boolean
}

export function CircleIcon(props: CircleIconProps) {
	return (
		<HeaderAction
			active={props.active}
			beat
			onContextMenu={(e) => {
				e.preventDefault()
				pushView({
					override: {
						circleWidget: false,
					},
					tabId: gvar.tabInfo.tabId,
				})
			}}
			onClick={(e) => {
				pushView({
					override: {
						circleWidget: !props.active,
					},
					tabId: gvar.tabInfo.tabId,
				})
				if (!props.active) feedbackText(gvar.gsm.options.flags.widget.headerTooltip, { x: e.clientX - 100, y: e.clientY + 40 }, 2400)
			}}
		>
			<FaCircleDot size="1.02rem" />
		</HeaderAction>
	)
}

function getKebabList(
	view: StateView,
	setView: SetView,
): {
	list: KebabListProps["list"]
	onSelect: (name: string) => void
	showAlert: boolean
} {
	if (!view) return { list: [], onSelect: () => {}, showAlert: false }
	let list: KebabListProps["list"] = []
	let fns: { [key: string]: () => void } = {}
	let showAlert = false

	const onSelect = (name: string) => fns[name]?.()

	// widget
	if (!isMobile()) {
		list.push({ label: gvar.gsm.options.flags.widget.option, name: "widget", checked: !!view.circleWidget })
		fns["widget"] = () => {
			setView({ circleWidget: !view.circleWidget })
		}
	}

	// Only shown if on http(s) protocol and have local shortcuts.
	if (gvar.showShortcutControl) {
		let url = new URL(gvar.tabInfo.url)
		let shortcutsInfo = getEnableShortcutsKebabInfo(view, setView, url)
		if (shortcutsInfo) {
			if (!shortcutsInfo.checked) showAlert = true
			fns["shortcuts"] = shortcutsInfo.fn
			list.push({
				className: "shortcutsKebabOption",
				checked: shortcutsInfo.checked,
				label: replaceArgs(gvar.gsm.token.allowShortcuts, [url.hostname.replace("www.", "")]),
				name: "shortcuts",
			})
		}
	}
	return { list, onSelect, showAlert }
}

function getEnableShortcutsKebabInfo(view: StateView, setView: SetView, url: URL): { checked: boolean; fn: () => void } {
	let conditions = view.keybindsUrlCondition || getDefaultURLCondition(true)
	let activeParts = getActiveParts(conditions)
	let matchingParts = activeParts.filter((p) => testURLWithPart(url.origin, p))
	let matched = matchingParts.length > 0
	let checked = conditions.block ? !matched : matched
	let listKey: "blockParts" | "allowParts" = conditions.block ? "blockParts" : "allowParts"

	return {
		checked,
		fn: () => {
			setView({
				keybindsUrlCondition: produce(conditions, (d) => {
					if ((!checked && conditions.block) || (checked && !conditions.block)) {
						const ids = new Set(d[listKey].map((p) => p.id))
						matchingParts.forEach((part) => ids.delete(part.id))
						d[listKey] = [...ids].map((id) => d[listKey].find((p) => p.id === id))
					} else {
						const part = getDefaultURLConditionPart()
						part.valueStartsWith = url.origin
						part.type = "STARTS_WITH"
						d[listKey].push(part)
					}
				}),
			})
		},
	}
}

let alreadyUpdatedCount = false
async function showOverlayForKebab(sawCount: number) {
	const option = document.querySelector(".shortcutsKebabOption")
	if (!option) return

	// Update count (Once per session at most)
	if (alreadyUpdatedCount) {
		alreadyUpdatedCount = true
	} else {
		pushView({ override: { sawEnableShortcutOverlayCount: (sawCount || 0) + 1 } })
	}

	const b = option.getBoundingClientRect()
	// This overlay is detached from React, so keep its complete scanned utility set here.
	const outline = document.createElement("div")
	outline.className = "pointer-events-none fixed z-debug border-4 border-primary"
	outline.style.left = `${b.x - 5}px`
	outline.style.top = `${b.y - 5}px`
	outline.style.width = `${b.width + 10}px`
	outline.style.height = `${b.height + 10}px`

	const pb = option.parentElement.getBoundingClientRect()
	const message = document.createElement("div")
	message.className = "pointer-events-none fixed z-debug w-full bg-secondary p-2.5 text-center text-sm font-bold text-primary"
	message.textContent = gvar.gsm.options.popup.enableShortcutsMessage
	message.style.top = `${pb.y + pb.height + 15}px`

	document.body.appendChild(outline)
	document.body.appendChild(message)
	let abort = new AbortController()

	abort.signal.addEventListener("abort", () => {
		outline.remove()
		message.remove()
	})

	window.addEventListener("pointerdown", (e) => abort.abort(), { capture: true, signal: abort.signal })
	window.addEventListener("keydown", (e) => abort.abort(), { capture: true, signal: abort.signal })
}
