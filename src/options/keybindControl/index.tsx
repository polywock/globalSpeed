import { RefObject, useState } from "react"
import { FaRegEdit } from "react-icons/fa"
import { Minmax } from "@/comps/Minmax"
import { Tooltip } from "@/comps/Tooltip"
import { gvar } from "@/globalVar"
import { getSelectedParts, requestSyncContextMenu } from "@/utils/configUtils"
import { produce } from "@/utils/helper"
import { CycleInput } from "../../comps/CycleInput"
import { KeyPicker } from "../../comps/KeyPicker"
import { makeMenuLabelWithTooltip } from "../../comps/Menu"
import { ModalText } from "../../comps/ModalText"
import { NumericInput } from "../../comps/NumericInput"
import { Select } from "../../comps/Select"
import { ThrottledTextInput } from "../../comps/ThrottledTextInput"
import { getDefaultURLCondition } from "../../defaults"
import { commandInfos } from "../../defaults/commands"
import { AdjustMode, Keybind, KeybindType, StateOption, Trigger } from "../../types"
import { requestCreateTab } from "../../utils/browserUtils"
import { domRectGetOffset, feedbackText, isFirefox, isMobile } from "../../utils/helper"
import { KebabList, KebabListProps } from "../KebabList"
import { URLModal } from "../URLModal"
import { DurationSelect, NameArea } from "./NameArea"

export type KeybindControlProps = {
	onChange: (id: string, newValue: Keybind) => void
	onRemove: (id: string) => void
	onMove: (id: string, newIndex: number) => void
	onDuplicate: (id: string) => void
	value: Keybind
	hideIndicator: boolean
	virtualInput?: boolean
	listRef: RefObject<HTMLElement>
	isLast?: boolean
	listType: KeybindType
}

export const KeybindControl = (props: KeybindControlProps) => {
	const { value } = props
	const [show, setShow] = useState(false)

	const command = commandInfos[value.command]
	const urlAllowed = value.trigger !== 2
	let adjustMode = command.valueType === "adjustMode" ? value.adjustMode || AdjustMode.SET : null

	let showNumericControl = false
	let showRange = false
	let ref = command.ref || command.getRef?.(command, value)

	let min = undefined as number
	let max = undefined as number
	let defaultValue = undefined as number
	let sliderMin = undefined as number
	let sliderMax = undefined as number

	if (ref) {
		min = ref.min
		max = ref.max
		defaultValue = ref.default
		sliderMin = ref.sliderMin
		sliderMax = ref.sliderMax

		if (adjustMode === AdjustMode.ADD || value.adjustMode === AdjustMode.ITC_REL) {
			min = null
			max = null
			defaultValue = adjustMode === AdjustMode.ADD ? ref.step : ref.itcStep
		}

		if (adjustMode === AdjustMode.ITC) {
			showRange = true
		} else if (adjustMode !== AdjustMode.CYCLE) {
			showNumericControl = true
		}

		if (command.valueType === "number") showNumericControl = true
	}

	const hasSpecial = value.command === "setMark" && ["::nameless", "::nameless-prev", "::nameless-next"].includes(value.valueString?.toLowerCase())

	const kebabList: KebabListProps["list"] = [
		{ name: "duplicate", label: gvar.gsm.token.duplicate, close: true },
		{ name: "label", label: gvar.gsm.options.editor.addLabel, close: true },
	]

	urlAllowed && kebabList.push({ name: "url", label: gvar.gsm.options.rules.conditions, close: true })

	command.hasFeedback &&
		kebabList.push({
			name: "invertIndicator",
			label: gvar.gsm.options.flags.showIndicator,
			checked: props.hideIndicator ? value.invertIndicator : !value.invertIndicator,
		})

	if (props.listType === "pageKeybinds") {
		kebabList.push({
			name: "longPress",
			checked: !!value.longPress,
			label: makeMenuLabelWithTooltip(gvar.gsm.options.editor.longPress, gvar.gsm.options.editor.longPressTooltip, "left"),
		})

		kebabList.push({
			name: "doubleTap",
			checked: !!value.doubleTap,
			label: makeMenuLabelWithTooltip(gvar.gsm.options.editor.doubleTap, gvar.gsm.options.editor.doubleTapTooltip, "left"),
		})

		kebabList.push({
			name: "noRepeat",
			checked: !!value.noRepeat,
			label: makeMenuLabelWithTooltip(gvar.gsm.options.editor.noRepeat, gvar.gsm.options.editor.noRepeatTooltip, "left"),
		})

		kebabList.push({
			name: "blockEvents",
			checked: !!value.greedy,
			label: makeMenuLabelWithTooltip(gvar.gsm.token.blockEvents, gvar.gsm.token.blockEventsTooltip, "left"),
		})
	}

	props.isLast ||
		kebabList.push({
			name: "spacing",
			label: gvar.gsm.options.editor.spacing,
			preLabel: value.spacing === 2 ? "2" : value.spacing === 1 ? "1" : null,
		})

	let valueFocusTooltip: string
	if (value.command === "nothing") {
		valueFocusTooltip = gvar.gsm.command.afxDelay
	}

	return (
		<div className="grid grid-cols-[max-content_minmax(200px,1.5fr)_175px_200px_max-content] items-center gap-x-2.5 [&_select]:[text-align-last:center]">
			{/* Url condition bubble */}
			{value.condition && getSelectedParts(value.condition).length ? (
				<Tooltip title={gvar.gsm.options.rules.conditions}>
					<div
						className="absolute -top-1.25 -right-1.25 rounded-bubble bg-destructive px-1.25 text-destructive-foreground"
						onClick={() => setShow(!show)}
						onContextMenu={(e) => {
							if (value.condition) {
								props.onChange(
									value.id,
									produce(value, (d) => {
										d.condition = getDefaultURLCondition()
									}),
								)
								e.preventDefault()
							}
						}}
					>
						{getSelectedParts(value.condition).length}
					</div>
				</Tooltip>
			) : null}

			{/* URL modal */}
			{!show ? null : (
				<URLModal
					context="keybind"
					onReset={() => {
						props.onChange(
							value.id,
							produce(value, (d) => {
								delete d.condition
							}),
						)
					}}
					onChange={(newValue) => {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.condition = newValue
							}),
						)
					}}
					onClose={() => {
						setShow(false)

						if (value.condition && !getSelectedParts(value.condition).length) {
							props.onChange(
								value.id,
								produce(value, (d) => {
									delete d.condition
								}),
							)
						}
					}}
					value={value.condition || getDefaultURLCondition(true)}
				/>
			)}

			{/* Status */}
			<Tooltip title={value.enabled ? gvar.gsm.token.off : gvar.gsm.token.on}>
				<input
					type="checkbox"
					aria-label={gvar.gsm.token.on}
					checked={!!value.enabled}
					onChange={(e) => {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.enabled = !value.enabled
								requestSyncContextMenu()
							}),
						)
					}}
				/>
			</Tooltip>

			{/* Name area */}
			<NameArea command={command} onChange={props.onChange} value={value} hasSpecial={hasSpecial} reference={ref} />

			<div className="grid gap-y-2.5">
				<TriggerValues value={value} onChange={props.onChange} virtualInput={props.virtualInput} />
				{value.allowAlt && adjustMode === AdjustMode.CYCLE && (
					<TriggerValues value={value} onChange={props.onChange} virtualInput={props.virtualInput} isAlt={true} />
				)}
			</div>

			{/* Numeric input */}
			{showNumericControl && !command.withDuration && (
				<NumericInput
					onFocus={
						valueFocusTooltip
							? (e) => {
									feedbackText(
										valueFocusTooltip,
										domRectGetOffset((e.currentTarget as HTMLInputElement).getBoundingClientRect(), 20, -50, true),
									)
								}
							: undefined
					}
					placeholder={defaultValue?.toString() ?? null}
					min={min}
					max={max}
					value={value.valueNumber}
					onChange={(v) => {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.valueNumber = v
							}),
						)
					}}
				/>
			)}

			{/* Duration with numeric iput  */}
			{showNumericControl && command.withDuration && (
				<div className="grid grid-cols-[1fr_max-content] gap-x-1.25">
					<NumericInput
						placeholder={defaultValue?.toString() ?? null}
						min={min}
						max={max}
						value={value.valueNumber}
						onChange={(v) => {
							props.onChange(
								value.id,
								produce(value, (d) => {
									d.valueNumber = v
								}),
							)
						}}
					/>
					<DurationSelect value={value} onChange={props.onChange} adjustMode={adjustMode} />
				</div>
			)}

			{/* Range input */}
			{showRange && (
				<Minmax
					defaultMin={sliderMin}
					defaultMax={sliderMax}
					realMin={min}
					realMax={max}
					min={value.valueItcMin}
					max={value.valueItcMax}
					onChange={(min, max) => {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.valueItcMin = min
								d.valueItcMax = max
							}),
						)
					}}
				/>
			)}

			{/* Cycle input */}
			{command.valueType === "adjustMode" && value.adjustMode === AdjustMode.CYCLE && (
				<CycleInput
					defaultValue={defaultValue}
					min={min}
					max={max}
					values={value.valueCycle || []}
					onChange={(v) => {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.valueCycle = v
							}),
						)
					}}
				/>
			)}

			{/* Text input */}
			{command.valueType === "string" && (
				<ThrottledTextInput
					passInput={{ className: "text-center", style: hasSpecial ? { color: "red" } : undefined }}
					value={value.valueString}
					onChange={(v) => {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.valueString = v
							}),
						)
					}}
				/>
			)}

			{/* Modal string input */}
			{command.valueType === "modalString" && (
				<ModalText
					label="edit code"
					value={value.valueString}
					onChange={(v) => {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.valueString = v
							}),
						)
					}}
				/>
			)}

			{/* State input  */}
			{command.valueType === "state" && (
				<Select
					className="text-center"
					aria-label={gvar.gsm.token.on}
					value={value.valueState}
					onChanged={(newValue) => {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.valueState = newValue as StateOption
							}),
						)
					}}
					options={(["on", "off", "toggle"] as StateOption[]).map((v) => ({ key: v, value: gvar.gsm.token[v] || "" }))}
				/>
			)}

			{/* No input */}
			{!command.valueType && <div />}

			{/* Menu kebab */}
			<KebabList
				list={kebabList}
				onSelect={(name) => {
					if (name === "invertIndicator") {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.invertIndicator = !d.invertIndicator
								if (d.invertIndicator == null) delete d.invertIndicator
							}),
						)
					} else if (name === "blockEvents") {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.greedy = !d.greedy
								if (d.greedy == null) delete d.greedy
							}),
						)
					} else if (name === "longPress") {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.longPress = !d.longPress
								if (d.longPress) {
									delete d.doubleTap
								} else {
									delete d.longPress
								}
							}),
						)
					} else if (name === "doubleTap") {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.doubleTap = !d.doubleTap
								if (d.doubleTap) {
									delete d.longPress
								} else {
									delete d.doubleTap
								}
							}),
						)
					} else if (name === "noRepeat") {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.noRepeat = !d.noRepeat
								if (!d.noRepeat) delete d.noRepeat
							}),
						)
					} else if (name === "autoPause") {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.autoPause = !d.autoPause
								if (d.autoPause == null) delete d.autoPause
							}),
						)
					} else if (name === "url") {
						setShow(true)
					} else if (name === "duplicate") {
						props.onDuplicate(value.id)
					} else if (name === "spacing") {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.spacing = ((d.spacing || 0) + 1) % 3
							}),
						)
					} else if (name === "label") {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d.label = prompt()
								if (!d.label) delete d.label
							}),
						)
					}
				}}
			/>
		</div>
	)
}

type Props = {
	value: Keybind
	virtualInput?: boolean
	onChange: (id: string, newValue: Keybind) => void
	isAlt?: boolean
}

export const TriggerValues = (props: Props) => {
	const { value, isAlt } = props
	let keyForGlobal = (isAlt ? "globalKeyAlt" : "globalKey") as "globalKey"
	let keyForLocal = (isAlt ? "keyAlt" : "key") as "key"
	let keyForLabel = (isAlt ? "contextLabelAlt" : "contextLabel") as "contextLabel"

	return (
		<>
			{/* Global key picker */}
			{value.trigger === Trigger.BROWSER && (
				<div className="grid grid-cols-[1fr_max-content] items-center gap-x-1.75">
					<Select
						aria-label={gvar.gsm.token.assign}
						value={value[keyForGlobal] || "commandA"}
						onChanged={(newValue) => {
							props.onChange(
								value.id,
								produce(value, (d) => {
									d[keyForGlobal] = newValue
								}),
							)
						}}
						options={"ABCDEFGHIJKLMNOPQRS".split("").map((v) => ({ key: `command${v}`, value: `command ${v}` }))}
					/>
					<Tooltip title={gvar.gsm.token.assign}>
						<button
							aria-label={gvar.gsm.token.assign}
							className="-translate-y-0.5 icon-button text-foreground"
							onClick={() => {
								requestCreateTab(
									isFirefox()
										? `https://support.mozilla.org/kb/manage-extension-shortcuts-firefox`
										: `chrome://extensions/shortcuts#:~:text=${encodeURIComponent(`Command ${(value[keyForGlobal] || "commandA").slice(7)}`)}`,
								)
							}}
						>
							<FaRegEdit className="scale-120" />
						</button>
					</Tooltip>
				</div>
			)}

			{/* Local key picker */}
			{(value.trigger || Trigger.PAGE) === Trigger.PAGE && (
				<KeyPicker
					virtual={props.virtualInput}
					value={value[keyForLocal]}
					onChange={(newKey) => {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d[keyForLocal] = newKey
							}),
						)
					}}
				/>
			)}

			{/* Context menu label */}
			{value.trigger === 2 && (
				<ThrottledTextInput
					passInput={{ className: "text-center" }}
					placeholder={gvar.gsm.options.editor.menuLabel}
					value={value[keyForLabel]}
					onChange={(newValue) => {
						props.onChange(
							value.id,
							produce(value, (d) => {
								d[keyForLabel] = newValue
								delete d.labelGsm
								delete d.labelGsmLang
								delete d.labelGsmPrefix
							}),
						)
						requestSyncContextMenu()
					}}
				/>
			)}
		</>
	)
}
