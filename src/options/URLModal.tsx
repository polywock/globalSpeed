import { GoX } from "react-icons/go"
import { Tooltip } from "@/comps/Tooltip"
import { gvar } from "@/globalVar"
import { extractURLPartValueKey, getActiveParts, getSelectedParts } from "@/utils/configUtils"
import { produce } from "@/utils/helper"
import { ModalBase, ModalContent } from "../comps/ModalBase"
import { ThrottledTextInput } from "../comps/ThrottledTextInput"
import { getDefaultURLConditionPart } from "../defaults"
import { URLCondition, URLConditionPart } from "../types"
import { findRemoveFromArray } from "../utils/helper"

type Props = {
	onClose: () => void
	onChange: (value: URLCondition) => void
	onReset: () => void
	value: URLCondition
	context: "keybinds" | "keybind" | "ghost" | "rule"
}

export function URLModal(props: Props) {
	const { value } = props
	const listKey = value.block ? "blockParts" : "allowParts"
	const parts = getSelectedParts(value)
	const isNeutral = !getActiveParts(value).length
	const subheadKey = `${props.context}${isNeutral ? "Neutral" : value.block ? "Block" : "Allow"}`
	const subheader = (gvar.gsm.options.rules.headers as any)[subheadKey]

	const onChange = (part: URLConditionPart) => {
		props.onChange(
			produce(value, (d) => {
				const idx = d[listKey].findIndex((p) => p.id === part.id)
				if (idx >= 0) {
					d[listKey][idx] = part
				}
			}),
		)
	}

	const onRemove = (part: URLConditionPart) => {
		props.onChange(
			produce(value, (d) => {
				findRemoveFromArray(d[listKey], (p) => p.id === part.id)
			}),
		)
	}

	return (
		<ModalBase keepOnWheel={true} onClose={props.onClose}>
			<ModalContent className="standard-scroll">
				{/* Header */}
				<div className="mb-2.5 grid grid-cols-[1fr_max-content]">
					{/* Label */}
					<div className="text-2xl">{gvar.gsm.options.rules.conditions}</div>

					{/* Match mode */}
					<select
						value={value.block ? "BLOCK" : "ALLOW"}
						onChange={(e) => {
							props.onChange(
								produce(value, (d) => {
									d.block = e.target.value === "BLOCK"
								}),
							)
						}}
					>
						<option value="ALLOW">{gvar.gsm.options.rules.allowlist}</option>
						<option value="BLOCK">{gvar.gsm.options.rules.blocklist}</option>
					</select>
				</div>

				{/* Subheader */}
				{subheader && <div className="-mt-2.5 mb-3.75 -translate-x-0.5 text-lg italic opacity-50">{`${subheader}${isNeutral ? "" : ":"}`}</div>}

				{/* Parts  */}
				<div className="mb-5">
					{parts.map((part) => (
						<ULRConditionPart key={part.id} onChange={onChange} onRemove={onRemove} part={part} />
					))}
				</div>

				{/* Controls */}
				<div className="grid grid-cols-[max-content_max-content] gap-x-2.5">
					{/* Create */}
					<button
						className="button-control"
						onClick={(e) => {
							props.onChange(
								produce(value, (d) => {
									d[listKey].push(getDefaultURLConditionPart())
								}),
							)
						}}
					>
						{gvar.gsm.token.create}
					</button>

					{/* Reset */}
					{parts.length ? (
						<button className="button-control" onClick={props.onReset}>
							{gvar.gsm.token.reset}
						</button>
					) : (
						<div></div>
					)}
				</div>
			</ModalContent>
		</ModalBase>
	)
}

function ULRConditionPart(props: { part: URLConditionPart; onChange: (part: URLConditionPart) => void; onRemove: (part: URLConditionPart) => void }) {
	const { part, onChange, onRemove } = props
	const valueKey = extractURLPartValueKey(part)

	return (
		<div className="mb-3.75 grid grid-cols-[max-content_max-content_1fr_max-content] items-center gap-x-2.5" key={part.id}>
			{/* Status */}
			<Tooltip title={part.disabled ? gvar.gsm.token.on : gvar.gsm.token.off}>
				<input
					type="checkbox"
					checked={!part.disabled}
					onChange={() => {
						onChange(
							produce(part, (d) => {
								d.disabled = !d.disabled
							}),
						)
					}}
				/>
			</Tooltip>

			{/* Match type */}
			<select
				value={part.type}
				onChange={(e) => {
					onChange(
						produce(part, (d) => {
							d.type = e.target.value as any
						}),
					)
				}}
			>
				<option value={"STARTS_WITH"}>{gvar.gsm.options.rules.startsWith}</option>
				<option value={"CONTAINS"}>{gvar.gsm.options.rules.contains}</option>
				<option value={"REGEX"}>{gvar.gsm.options.rules.regex}</option>
			</select>

			{/* Terms */}
			<ThrottledTextInput
				value={part[valueKey]}
				onChange={(newValue) => {
					onChange(
						produce(part, (d) => {
							d[valueKey] = newValue
						}),
					)
				}}
			/>

			{/* Delete */}
			<Tooltip title={gvar.gsm.token.delete}>
				<button
					className="icon-button"
					onClick={() => {
						onRemove(part)
					}}
				>
					<GoX size="1.6rem" />
				</button>
			</Tooltip>
		</div>
	)
}
