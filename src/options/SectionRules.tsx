import { RefObject, useRef, useState } from "react"
import { GearIcon } from "@/comps/GearIcon"
import { Select } from "@/comps/Select"
import { Tooltip } from "@/comps/Tooltip"
import { Button } from "@/comps/ui/button"
import { gvar } from "@/globalVar"
import { IS_FIREFOX_BUILD } from "@/utils/buildFlags"
import { getSelectedParts } from "@/utils/configUtils"
import { moveItem, produce, randomId } from "@/utils/helper"
import { makeMenuLabelWithTooltip } from "../comps/Menu"
import { ModalBase } from "../comps/ModalBase"
import { ModalText } from "../comps/ModalText"
import { NumericInput } from "../comps/NumericInput"
import { getDefaultFx, getDefaultURLCondition, getDefaultURLRule } from "../defaults"
import { useStateView } from "../hooks/useStateView"
import { FxControl } from "../popup/FxControl"
import { URLRule, URLStrictness } from "../types"
import { DevWarning } from "./DevWarning"
import { KebabList, KebabListProps } from "./KebabList"
import { List } from "./List"
import { ListItem } from "./ListItem"
import { OptionsSection } from "./OptionsSection"
import { URLModal } from "./URLModal"

export function SectionRules(props: {}) {
	const [view, setView] = useStateView({ rules: true })
	const listRef = useRef<HTMLDivElement>(null)
	if (!view) return <div></div>

	const rules = view.rules || []

	const handleChange = (newRule: URLRule, remove?: boolean, duplicate?: boolean) => {
		setView({
			rules: produce(rules, (d) => {
				const idx = d.findIndex((v) => v.id === newRule.id)
				if (remove) {
					if (idx < 0) return
					d.splice(idx, 1)
					return
				}

				if (duplicate) {
					if (idx < 0) return
					const rule = structuredClone(newRule)
					rule.id = randomId()
					d.splice(idx, 0, rule)
					return
				}

				if (idx >= 0) {
					d[idx] = newRule
				} else {
					d.push(newRule)
				}
			}),
		})
	}

	const handleMove = (id: string, newIndex: number) => {
		setView({
			rules: produce(rules, (d) => {
				moveItem(d, (v) => v.id === id, newIndex)
			}),
		})
	}

	const handleSpacingChange = (index: number) => {
		setView({
			rules: produce(rules, (d) => {
				const rule = rules[index]
				if (!rule) return
				rule.spacing = ((rule.spacing || 0) + 1) % 3
			}),
		})
	}

	return (
		<OptionsSection>
			<h2>{gvar.gsm.options.rules.header}</h2>
			{IS_FIREFOX_BUILD ? null : <DevWarning forUrlRules={true} hasJs={rules?.some((r) => r.enabled && r.type === "JS")} />}
			<List listRef={listRef} spacingChange={handleSpacingChange}>
				{rules.map((rule, i) => (
					<ListItem
						key={rule.id}
						isEnabled={rule.enabled}
						listRef={listRef}
						onMove={(newIdx) => handleMove(rule.id, newIdx)}
						spacing={rule.spacing}
						onRemove={() => handleChange(rule, true)}
						label={rule.label}
						onClearLabel={() => {
							handleChange(
								produce(rule, (d) => {
									delete d.label
								}),
							)
						}}
					>
						<Rule isLast={i === rules.length - 1} listRef={listRef} rule={rule} onChange={handleChange} />
					</ListItem>
				))}
			</List>
			<Button className="mt-7.5 block" onClick={(e) => handleChange(getDefaultURLRule())}>
				{gvar.gsm.token.create}
			</Button>
		</OptionsSection>
	)
}

type RuleProps = {
	rule: URLRule
	listRef: RefObject<HTMLElement>
	isLast?: boolean
	onChange: (rule: URLRule, remove?: boolean, duplicate?: boolean) => void
}

export function Rule(props: RuleProps) {
	const { rule, onChange } = props
	const [show, setShow] = useState(false)

	const list: KebabListProps["list"] = [
		{ name: "duplicate", label: gvar.gsm.token.duplicate, close: true },
		{ name: "label", label: gvar.gsm.options.editor.addLabel, close: true },
		{
			name: "titleRestrict",
			label: makeMenuLabelWithTooltip(
				rule.titleRestrict ? gvar.gsm.options.rules.clearTitleKeywords : gvar.gsm.options.rules.setTitleKeywords,
				gvar.gsm.options.rules.pageTitleTooltip,
				"left",
			),
			close: true,
		},
	]

	if (rule.titleRestrict) {
		list.push({
			name: "changeTitleRestrict",
			label: gvar.gsm.options.rules.ChangeTitleKeywords,
			close: true,
		})
	}

	if (rule.type !== "JS") {
		list.push({
			name: "strictness",
			label: makeMenuLabelWithTooltip(gvar.gsm.options.rules.strictness, gvar.gsm.options.rules.strictnessTooltip, "left"),
			preLabel: `${rule.strictness ?? URLStrictness.DIFFERENT_HOST}`,
		})
	}

	props.isLast ||
		list.push({
			name: "spacing",
			label: gvar.gsm.options.editor.spacing,
			preLabel: props.rule.spacing === 2 ? "2" : props.rule.spacing === 1 ? "1" : null,
		})

	return (
		<div className="grid grid-cols-[max-content_600px_1fr_repeat(2,max-content)] items-center gap-x-2.5">
			{/* Status */}
			<Tooltip title={rule.enabled ? gvar.gsm.token.off : gvar.gsm.token.on}>
				<input
					type="checkbox"
					aria-label={gvar.gsm.token.on}
					checked={!!rule.enabled}
					onChange={(e) => {
						onChange(
							produce(rule, (d) => {
								d.enabled = !d.enabled
							}),
						)
					}}
				/>
			</Tooltip>

			{/* URL conditions entry */}
			<Tooltip title={gvar.gsm.options.rules.conditions}>
				<Button
					onClick={(e) => {
						setShow(!show)
					}}
				>{`— ${rule.condition ? getSelectedParts(rule.condition).length : 0} —`}</Button>
			</Tooltip>

			{/* URL conditions modal */}
			{show ? (
				<URLModal
					context="rule"
					onReset={() => {
						onChange(
							produce(rule, (d) => {
								delete d.condition
							}),
						)
					}}
					onChange={(v) => {
						onChange(
							produce(rule, (d) => {
								d.condition = v
							}),
						)
					}}
					onClose={() => setShow(false)}
					value={rule.condition || getDefaultURLCondition()}
				/>
			) : null}

			{/* Rule type */}
			<Select
				value={rule.type}
				onChanged={(newValue) => {
					onChange(
						produce(rule, (d) => {
							d.type = newValue as any
						}),
					)
				}}
				options={[
					{ key: "ON", value: gvar.gsm.token.on },
					{ key: "OFF", value: gvar.gsm.token.off },
					{ key: "SPEED", value: gvar.gsm.command.speed },
					{ key: "FX", value: gvar.gsm.command.fxFilter },
					{ key: "JS", value: gvar.gsm.command.runCode },
				]}
			/>

			<div className="grid auto-cols-max grid-flow-col items-center justify-start gap-x-2.5">
				{/* Speed input  */}
				{rule.type == "SPEED" && (
					<NumericInput
						className="w-15"
						noNull={true}
						min={1 / 16}
						max={16}
						value={rule.overrideSpeed ?? 1}
						onChange={(v) => {
							onChange(
								produce(rule, (d) => {
									d.overrideSpeed = v
								}),
							)
						}}
					/>
				)}

				{/* FX input  */}
				{rule.type == "FX" && <FxRuleControl rule={rule} onChange={onChange} />}

				{/* JS input  */}
				{rule.type == "JS" && (
					<ModalText
						value={rule.overrideJs || ""}
						onChange={(v) => {
							onChange(
								produce(rule, (d) => {
									d.overrideJs = v
								}),
							)
						}}
					/>
				)}
			</div>

			<KebabList
				list={list}
				onSelect={(name) => {
					if (name === "duplicate") {
						props.onChange(rule, false, true)
					} else if (name === "label") {
						props.onChange(
							produce(rule, (d) => {
								d.label = prompt()
								if (!d.label) delete d.label
							}),
						)
					} else if (name === "spacing") {
						props.onChange(
							produce(rule, (d) => {
								d.spacing = ((d.spacing || 0) + 1) % 3
							}),
						)
					} else if (name === "strictness") {
						props.onChange(
							produce(rule, (d) => {
								d.strictness = ((d.strictness ?? URLStrictness.DIFFERENT_HOST) % 4) + 1
							}),
						)
					} else if (name === "titleRestrict") {
						props.onChange(
							produce(rule, (d) => {
								d.titleRestrict = d.titleRestrict
									? null
									: normalizeTitleKeywords(prompt(gvar.gsm.options.rules.pageTitleLabel, "top hits, music, official video, live, lyrics"))
							}),
						)
					} else if (name === "changeTitleRestrict") {
						props.onChange(
							produce(rule, (d) => {
								d.titleRestrict = normalizeTitleKeywords(prompt(gvar.gsm.options.rules.pageTitleLabel, d.titleRestrict) ?? d.titleRestrict)
							}),
						)
					}
				}}
			/>
		</div>
	)
}

type FxRuleControlProps = {
	rule: URLRule
	onChange: (rule: URLRule, remove?: boolean) => void
}

function FxRuleControl(props: FxRuleControlProps) {
	const [open, setOpen] = useState(false)

	let overrideFx = (props.rule.overrideFx || {}) as typeof props.rule.overrideFx
	overrideFx.backdropFx = overrideFx.backdropFx || getDefaultFx()
	overrideFx.elementFx = overrideFx.elementFx || getDefaultFx()

	return (
		<div>
			<GearIcon onClick={(e) => setOpen(!open)} />
			{open && (
				<ModalBase keepOnWheel={true} onClose={() => setOpen(false)}>
					<FxControl
						className="max-h-[80vh] w-[300px] max-w-[400px] overflow-y-scroll p-2 mobile:max-h-[80%]"
						enabled={true}
						_elementFx={overrideFx.elementFx}
						_backdropFx={overrideFx.backdropFx}
						handleChange={(elementFx, backdropFx) => {
							props.onChange(
								produce(props.rule, (d) => {
									d.overrideFx = {
										elementFx,
										backdropFx,
									}
								}),
							)
						}}
					/>
				</ModalBase>
			)}
		</div>
	)
}

function normalizeTitleKeywords(titles: string) {
	titles = titles || ""
	return [
		...new Set(
			titles
				.toLowerCase()
				.split(/,+\s+/)
				.filter((tag) => tag.trim()),
		),
	].join(", ")
}
