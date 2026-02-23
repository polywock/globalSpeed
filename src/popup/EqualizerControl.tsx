import { AudioFx } from "../types"
import { FaPowerOff } from "react-icons/fa"
import { getDefaultEq, EQ_PRESETS } from "../defaults"
import { formatFreq } from "../utils/helper"
import { SliderMicro } from "../comps/SliderMicro"
import { produce } from "immer"
import "./EqualizerControl.css"
import { useMemo } from "react"
import equal from "fast-deep-equal"
import { Reset } from "../comps/Reset"
import { useTooltipAnchor } from "@/comps/Tooltip"

type EqualizerControlProps = {
	value: AudioFx["eq"]
	onChange: (newEq: AudioFx["eq"]) => void
}

export function EqualizerControl(props: EqualizerControlProps) {
	const eq = props.value
	const presets = (EQ_PRESETS as any)[eq.values.length.toString()] as (typeof EQ_PRESETS)["10"]

	const isEmpty = useMemo(() => equal(eq || getDefaultEq(), getDefaultEq()), [eq])

	const powTip = useTooltipAnchor<HTMLDivElement>({ label: gvar.gsm.audio.equalizerPower, align: "top" })

	return (
		<div className="EqualizerControl audioTab">
			<div className="header">
				<div className={eq.enabled ? "active" : "muted"}>
					<FaPowerOff
						size="1.21rem"
						onClick={() => {
							props.onChange(
								produce(eq, (d) => {
									d.enabled = !d.enabled
								}),
							)
						}}
					/>
				</div>
				<div className="name">{gvar.gsm.audio.equalizer}</div>
				<div className="reset">
					<Reset
						active={!isEmpty}
						onClick={() => {
							props.onChange(getDefaultEq())
						}}
					/>
				</div>
			</div>

			{/* Band count */}
			<div className="preset">
				<select
					value={eq.values.length.toString()}
					onChange={(e) => {
						const bandCount = parseInt(e.target.value)
						if (bandCount === eq.values.length) return
						props.onChange(
							produce(eq, (d) => {
								d.values = Array(bandCount).fill(0)
								delete d.name
							}),
						)
					}}
				>
					<option value="10">10</option>
					<option value="20">20</option>
					<option value="30">30</option>
				</select>

				{/* Presets */}
				<select
					value={eq.name || ""}
					onChange={(e) => {
						if (e.target.value === "") {
							props.onChange(
								produce(eq, (d) => {
									delete d.name
								}),
							)
							return
						}
						const target = presets?.find((v) => v.name === e.target.value)
						if (!target) return
						props.onChange(
							produce(eq, (d) => {
								d.enabled = true
								d.name = target.name
								d.values = target.values
							}),
						)
					}}
				>
					<option value="">{"---"}</option>
					{(presets ?? []).map((v) => (
						<option key={v.name} value={v.name}>
							{v.name}
						</option>
					))}
				</select>
			</div>

			<div className="values">
				{/* Power */}
				<SliderMicro
					key="intensity"
					label={"POW"}
					value={eq.factor ?? 1}
					sliderMin={0}
					sliderMax={3}
					default={1}
					pass={{ style: { marginBottom: "10px" }, ref: powTip }}
					onChange={(newValue) => {
						props.onChange(
							produce(eq, (d) => {
								d.factor = newValue
								delete d.name
							}),
						)
					}}
				/>

				{/* EQ sliders */}
				{eq.values.map((value, i) => {
					const freq = 31.25 * 2 ** (i / Math.round(eq.values.length / 10))
					return (
						<SliderMicro
							key={freq.toString()}
							label={`${i === 0 ? "<" : i === eq.values.length - 1 ? ">" : ""}${formatFreq(freq)}`}
							value={value}
							sliderMin={-20}
							sliderMax={20}
							sliderStep={0.1}
							min={-40}
							max={40}
							default={0}
							onChange={(newValue) => {
								props.onChange(
									produce(eq, (d) => {
										if (newValue !== 0) {
											d.enabled = true
										}
										d.values[i] = newValue
										delete d.name
									}),
								)
							}}
						/>
					)
				})}
			</div>
		</div>
	)
}
