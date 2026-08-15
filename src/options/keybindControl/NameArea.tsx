import { Draft } from "immer"
import { useRef, useState } from "react"
import { FaEquals, FaList, FaMousePointer, FaPlus } from "react-icons/fa"
import { IoEllipsisVertical } from "react-icons/io5"
import { MdWarning } from "react-icons/md"
import { GearIcon } from "@/comps/GearIcon"
import { RegularTooltip } from "@/comps/RegularTooltip"
import { ToggleButton } from "@/comps/ToggleButton"
import { Tooltip } from "@/comps/Tooltip"
import { gvar } from "@/globalVar"
import { isSeekSmall } from "@/utils/configUtils"
import { produce, replaceArgs } from "@/utils/helper"
import { KeybindControlProps } from "."
import { makeMenuLabelWithTooltip, MenuProps } from "../../comps/Menu"
import { Select } from "../../comps/Select"
import { filterInfos, FilterName, filterTargets } from "../../defaults/filters"
import { AdjustMode, Command, Duration, Keybind, ReferenceValues, TargetFx, Trigger } from "../../types"
import { assertType, createWindowWithSafeBounds, getPopupSize, isMobile } from "../../utils/helper"
import { CinemaModal } from "../CinemaModal"
import { KebabList, KebabListProps } from "../KebabList"

const invertableKeys = new Set([
	"autoPause",
	"skipPauseSmall",
	"pauseWhileScrubbing",
	"relativeToSpeed",
	"wraparound",
	"itcWraparound",
	"showNetDuration",
	"seekOnce",
	"allowAlt",
	"cycleNoWrap",
	"noHold",
	"ignoreNavigate",
	"skipToggleSpeed",
	"alwaysOn",
])
const memMap = new Map<string, any>()

function saveToMem(kb: Keybind, adjustMode: AdjustMode) {
	memMap.set(`${kb.id}:${adjustMode}:${kb.duration}:${kb.filterOption}`, {
		valueNumber: kb.valueNumber,
		valueItcMin: kb.valueItcMin,
		valueItcMax: kb.valueItcMax,
		valueCycle: kb.valueCycle,
	})
}

function restoreFromMem(kb: Draft<Keybind>, adjustMode: AdjustMode, clearBase?: boolean) {
	const cached = memMap.get(`${kb.id}:${adjustMode}:${kb.duration}:${kb.filterOption}`)
	if (clearBase) {
		delete kb.valueNumber
		delete kb.valueItcMin
		delete kb.valueItcMax
		delete kb.valueCycle
	}
	if (!cached) return
	Object.assign(kb, cached)
	return true
}

type NameAreaProps = {
	command: Command
	onChange: KeybindControlProps["onChange"]
	value: KeybindControlProps["value"]
	hasSpecial: boolean
	reference: ReferenceValues
}

type Env = {
	adjustModeTitle?: string
}

export function NameArea(props: NameAreaProps) {
	const { command, value, hasSpecial } = props
	const env = useRef({} as Env).current

	const kebabList: KebabListProps["list"] = []
	const kebabListHandlers: KebabListProps["onSelect"][] = [
		(name: string) => {
			if (invertableKeys.has(name)) {
				invertFlag(name as keyof Keybind)
				return true
			}
		},
	]

	let label = (gvar.gsm.command as any)[command.ffName || value.command]
	let tooltip = (gvar.gsm.command as any)[value.command.concat("Tooltip")]

	let tabCaptureHint =
		command.requiresTabCapture &&
		!(value.command === "afxCapture" || value.command === "afxReset") &&
		(value.trigger || Trigger.PAGE) === Trigger.PAGE
	let adjustMode = command.valueType === "adjustMode" ? value.adjustMode || AdjustMode.SET : null
	let showNumeric = adjustMode !== AdjustMode.ITC && adjustMode !== AdjustMode.CYCLE

	if (hasSpecial) label = "special"

	const invertFlag = (key: string) => {
		assertType<keyof Keybind>(key)
		props.onChange(
			value.id,
			produce(value, (d) => {
				;(d as any)[key] = !d[key]
				if (!d[key]) delete d[key]
			}),
		)
	}

	value.command === "seek" && ensureSeekList(kebabList, kebabListHandlers, value, invertFlag, props.reference)
	value.command === "speed" && ensureSpeedList(kebabList, kebabListHandlers, value, invertFlag)
	;(value.adjustMode === AdjustMode.ITC || value.adjustMode === AdjustMode.ITC_REL) && ensureItcList(kebabList, kebabListHandlers, value, invertFlag)
	value.adjustMode === AdjustMode.CYCLE && ensureCycleList(kebabList, kebabListHandlers, value, invertFlag)
	if (value.command === "state" && value.trigger !== Trigger.MENU)
		kebabList.push({
			name: "alwaysOn",
			checked: value.alwaysOn,
			label: makeMenuLabelWithTooltip(gvar.gsm.command.alwaysOn, gvar.gsm.command.alwaysOnTooltip),
		})
	if (value.command === "loop" || value.command === "skip")
		kebabList.push({
			name: "ignoreNavigate",
			checked: !value.ignoreNavigate,
			label: makeMenuLabelWithTooltip(
				gvar.gsm.command.autoBreak,
				value.command === "loop" ? gvar.gsm.command.autoBreakTooltip : gvar.gsm.command.autoBreakTooltipAlt,
			),
		})

	return (
		<div className="command flex flex-wrap items-center gap-x-2.5 gap-y-1.25">
			{/* Label. Enlarged first letter. */}
			<span className="first-letter:text-xl">{label}</span>

			{/* Capture shortcut warning */}
			{tabCaptureHint && (
				<Tooltip title={replaceArgs(gvar.gsm.warnings.captureRequired, [`(${gvar.gsm.command.afxCapture})`])} allowClick>
					<span className="-ml-1.25 text-primary">
						<MdWarning size="1.35rem" />
					</span>
				</Tooltip>
			)}

			{/* cycle adjustMode */}
			{command.valueType === "adjustMode" && (
				<Tooltip title={gvar.gsm.options.editor.adjustModes[value.adjustMode || AdjustMode.SET]}>
					<button
						className="adjustMode button-control border-border p-0.75 text-2xs"
						onClick={(e) => {
							props.onChange(
								value.id,
								produce(value, (d) => {
									saveToMem(value, adjustMode)
									d.adjustMode = (adjustMode % (isMobile() ? 3 : 5)) + 1
									restoreFromMem(d, d.adjustMode, true)
								}),
							)
						}}
					>
						{(value.adjustMode || AdjustMode.SET) === AdjustMode.SET && <FaEquals size="1em" />}
						{value.adjustMode === AdjustMode.ADD && <FaPlus size="1em" />}
						{value.adjustMode === AdjustMode.CYCLE && <FaList size="1em" />}
						{value.adjustMode === AdjustMode.ITC && (
							<>
								<FaMousePointer size="1em" />
								<FaEquals size="1em" />
							</>
						)}
						{value.adjustMode === AdjustMode.ITC_REL && (
							<>
								<FaMousePointer size="1em" />
								<FaPlus size="1em" />
							</>
						)}
					</button>
				</Tooltip>
			)}

			{/* Tooltip */}
			{tooltip && <RegularTooltip align="top" title={tooltip} className="-ml-1.25" />}

			{value.command === "cinema" && <Cinema value={value} onChange={props.onChange} />}

			{/* Fullscreen: native */}
			{value.command === "fullscreen" && (
				<>
					<ToggleButton
						active={value.direct}
						className="px-1.25 py-0.5"
						onClick={(e) => {
							props.onChange(
								value.id,
								produce(value, (d) => {
									d.direct = !d.direct
								}),
							)
						}}
					>
						{gvar.gsm.command.nativeTooltip}
					</ToggleButton>
				</>
			)}

			{/* Filter stuff */}
			<FilterSelect value={value} command={command} onChange={props.onChange} adjustMode={adjustMode} />

			{/* Duration  */}
			{command.withDuration && !showNumeric && <DurationSelect value={value} onChange={props.onChange} adjustMode={adjustMode} />}

			{/* Kebab menu  */}
			{!!kebabList.length && (
				<KebabList
					buttonClassName="-ml-1.25"
					list={kebabList}
					onSelect={(name) => {
						for (let handler of kebabListHandlers) {
							if (handler(name)) return
						}
					}}
				/>
			)}

			{/* URL mode */}
			<UrlMode value={value} onChange={props.onChange} />
			{value.command === "intoPopup" && (
				<GearIcon
					onClick={() => {
						void openPlacerWindow(value.id, "popup", value.valuePopupRect)
					}}
				/>
			)}
		</div>
	)
}

function ensureSeekList(
	list: KebabListProps["list"],
	handlers: KebabListProps["onSelect"][],
	value: KeybindControlProps["value"],
	invertFlag: (key: string) => any,
	reference?: ReferenceValues,
) {
	let adjustMode = value.adjustMode || AdjustMode.SET

	const pauseNormal = { name: "autoPause", label: gvar.gsm.command.pause, checked: !!value.autoPause } as MenuProps["items"][number]
	const pauseSmall = { name: "skipPauseSmall", label: gvar.gsm.command.pause, checked: !value.skipPauseSmall } as MenuProps["items"][number]

	if (adjustMode === AdjustMode.ITC_REL || adjustMode === AdjustMode.ITC) {
		list.push({
			name: "pauseWhileScrubbing",
			label: gvar.gsm.options.editor.pauseWhileScrubbing,
			checked: value.pauseWhileScrubbing,
		} as MenuProps["items"][number])
	} else {
		list.push(isSeekSmall(value, reference) ? pauseSmall : pauseNormal)
	}

	if (adjustMode === AdjustMode.ADD || adjustMode === AdjustMode.ITC_REL) {
		list.push({ name: "relativeToSpeed", checked: !!value.relativeToSpeed, label: gvar.gsm.command.relativeToSpeed })

		adjustMode === AdjustMode.ADD &&
			list.push(
				{
					name: "wraparound",
					checked: value.wraparound,
					label: makeMenuLabelWithTooltip(gvar.gsm.options.editor.wraparound, gvar.gsm.options.editor.wraparoundTooltip),
				},
				{ name: "showNetDuration", checked: !!value.showNetDuration, label: gvar.gsm.command.showNet },
			)

		adjustMode === AdjustMode.ITC_REL &&
			list.push({
				name: "itcWraparound",
				checked: value.itcWraparound,
				label: makeMenuLabelWithTooltip(gvar.gsm.options.editor.wraparound, gvar.gsm.options.editor.wraparoundTooltip),
			})
	}
}

function ensureItcList(
	list: KebabListProps["list"],
	handlers: KebabListProps["onSelect"][],
	value: KeybindControlProps["value"],
	invertFlag: (key: string) => any,
) {
	let relative = value.adjustMode === AdjustMode.ITC_REL

	list.push({
		name: "seekOnce",
		label: makeMenuLabelWithTooltip(gvar.gsm.options.editor.liveScrubbing, gvar.gsm.options.editor.liveScrubbingTooltip),
		checked: !value.seekOnce,
	})
	if ((value.trigger || Trigger.PAGE) === Trigger.PAGE) {
		list.push({
			name: "noHold",
			label: makeMenuLabelWithTooltip(gvar.gsm.options.editor.pressAndHold, gvar.gsm.options.editor.pressAndHoldTooltip),
			checked: !value.noHold,
		})
	}
}

function ensureCycleList(
	list: KebabListProps["list"],
	handlers: KebabListProps["onSelect"][],
	value: KeybindControlProps["value"],
	invertFlag: (key: string) => any,
) {
	list.push({
		name: "allowAlt",
		close: true,
		checked: value.allowAlt,
		label: makeMenuLabelWithTooltip(gvar.gsm.options.editor.reversible, gvar.gsm.options.editor.reversibleTooltip),
	})
	value.allowAlt &&
		list.push({
			name: "cycleNoWrap",
			checked: !value.cycleNoWrap,
			label: makeMenuLabelWithTooltip(gvar.gsm.options.editor.wraparound, gvar.gsm.options.editor.wraparoundTooltip),
		})
}

function ensureSpeedList(
	list: KebabListProps["list"],
	handlers: KebabListProps["onSelect"][],
	value: KeybindControlProps["value"],
	invertFlag: (key: string) => any,
) {
	if ((value.adjustMode || AdjustMode.SET) !== AdjustMode.SET) return

	list.push({
		name: "skipToggleSpeed",
		checked: !value.skipToggleSpeed,
		label: makeMenuLabelWithTooltip(gvar.gsm.command.toggleSpeed, gvar.gsm.command.toggleSpeedTooltip),
	})

	handlers.push((name: string) => {
		if (invertableKeys.has(name)) {
			invertFlag(name as keyof Keybind)
			return true
		}
	})
}

type FilterSelectProps = {
	command: Command
	onChange: KeybindControlProps["onChange"]
	value: KeybindControlProps["value"]
	adjustMode: AdjustMode
}

function FilterSelect(props: FilterSelectProps) {
	const { value, command, onChange } = props
	if (command.withFilterTarget || command.withFilterOption) {
		return (
			<div className="flex items-center gap-x-1">
				{command.withFilterTarget && (
					<Select
						value={value.filterTarget}
						onChanged={(newValue) => {
							onChange(
								value.id,
								produce(value, (d) => {
									d.filterTarget = newValue as TargetFx
								}),
							)
						}}
						options={filterTargets.map((v) => ({
							key: v,
							value: (gvar.gsm.token as any)[v === "backdrop" ? "page" : v === "element" ? "video" : "both"],
						}))}
					/>
				)}
				{command.withFilterOption && (
					<Select
						value={value.filterOption}
						onChanged={(newValue) => {
							props.onChange(
								value.id,
								produce(value, (d) => {
									saveToMem(value, props.adjustMode)
									d.filterOption = newValue as FilterName
									restoreFromMem(d, props.adjustMode, true)
								}),
							)
						}}
						options={Object.keys(filterInfos).map((k) => ({ key: k, value: gvar.gsm.filter[k as FilterName] || "" }))}
					/>
				)}
			</div>
		)
	}
}

type UrlModeProps = {
	onChange: KeybindControlProps["onChange"]
	value: KeybindControlProps["value"]
}

function UrlMode(props: UrlModeProps) {
	const { value, onChange } = props

	return (
		<>
			{value.command === "openUrl" && (
				<Select
					value={value.valueUrlMode || "fgTab"}
					onChanged={(newValue) => {
						onChange(
							value.id,
							produce(value, (d) => {
								d.valueUrlMode = newValue as any
								if (d.valueUrlMode === "fgTab") delete d.valueUrlMode
								let isPopup = d.valueUrlMode === "newPopup"
								if (isPopup || d.valueUrlMode === "newWindow") {
									void openPlacerWindow(value.id, isPopup ? "popup" : "normal")
								}
							}),
						)
					}}
					options={[
						{ key: "fgTab", value: gvar.gsm.options.editor.openModes.foregroundTab },
						{ key: "bgTab", value: gvar.gsm.options.editor.openModes.backgroundTab },
						{ key: "sameTab", value: gvar.gsm.options.editor.openModes.sameTab },
						{ key: "newWindow", value: gvar.gsm.options.editor.openModes.newWindow },
						{ key: "newPopup", value: gvar.gsm.options.editor.openModes.newPopup },
					]}
				/>
			)}
		</>
	)
}

async function openPlacerWindow(id: string, type: "popup" | "normal", rect?: Keybind["valuePopupRect"]) {
	const url = chrome.runtime.getURL(`placer.html?id=${id}`)
	await createWindowWithSafeBounds({ url, type, ...(rect ?? getPopupSize()) })
}

type DurationSelectProps = {
	onChange: KeybindControlProps["onChange"]
	value: KeybindControlProps["value"]
	adjustMode: AdjustMode
}

export function DurationSelect(props: DurationSelectProps) {
	const { value, onChange } = props

	return (
		<>
			<Select
				value={`${value.duration || Duration.SECS}`}
				onChanged={(newValue) => {
					onChange(
						value.id,
						produce(value, (d) => {
							saveToMem(value, props.adjustMode)

							d.duration = parseInt(newValue)
							if (d.duration === Duration.SECS) {
								delete d.duration
							}
							restoreFromMem(d, props.adjustMode, true)
						}),
					)
				}}
				options={[
					{ key: `${Duration.SECS}`, value: gvar.gsm.token.seconds },
					{ key: `${Duration.PERCENT}`, value: gvar.gsm.token.percent },
					{ key: `${Duration.FRAMES}`, value: gvar.gsm.token.frames },
				]}
			/>
		</>
	)
}

function Cinema(props: { value: Keybind; onChange: (id: string, v: Keybind) => void }) {
	let [show, setShow] = useState(false)

	return (
		<>
			<Tooltip title={gvar.gsm.token.showMore}>
				<button className="icon-button" onClick={() => setShow(true)}>
					<IoEllipsisVertical className="pointer-events-none" title="..." size="1.3em" />
				</button>
			</Tooltip>
			{show && <CinemaModal value={props.value} onChange={props.onChange} onClose={() => setShow(false)} />}
		</>
	)
}
