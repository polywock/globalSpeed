import equal from "fast-deep-equal"
import { useMemo } from "react"
import { FaPowerOff } from "react-icons/fa"
import { Tooltip } from "@/comps/Tooltip"
import { EQ_PRESETS } from "@/defaults/eqPresets"
import { gvar } from "@/globalVar"
import { cn, produce, round } from "@/utils/helper"
import { Reset } from "../comps/Reset"
import { SliderMicro } from "../comps/SliderMicro"
import { getDefaultEq } from "../defaults"
import { AudioFx } from "../types"

type EqualizerControlProps = {
	value: AudioFx["eq"]
	onChange: (newEq: AudioFx["eq"]) => void
	className?: string
}

export function EqualizerControl(props: EqualizerControlProps) {
	const eq = props.value
	const presets = (EQ_PRESETS as any)[eq.values.length.toString()] as (typeof EQ_PRESETS)["10"]

	const isEmpty = useMemo(() => equal(eq || getDefaultEq(), getDefaultEq()), [eq])

	return (
		<div className={cn("EqualizerControl mt-[15px] rounded-lg border border-solid border-border-x p-[10px] select-none", props.className)}>
			<div className="header mb-[10px] grid grid-cols-[max-content_1fr_max-content] items-center gap-x-[5px] text-[1.2em]">
				<div className={eq.enabled ? "active text-tertiary" : "muted text-muted-foreground"}>
					<Tooltip title={eq.enabled ? gvar.gsm.token.off : gvar.gsm.token.on}>
						<FaPowerOff
							className="cursor-pointer"
							size="1.21rem"
							onClick={() => {
								props.onChange(
									produce(eq, (d) => {
										d.enabled = !d.enabled
									}),
								)
							}}
						/>
					</Tooltip>
				</div>
				<div className="name">{gvar.gsm.audio.equalizer}</div>
				<div className="reset justify-self-end">
					<Reset
						active={!isEmpty}
						className="cursor-pointer"
						onClick={() => {
							props.onChange(getDefaultEq())
						}}
					/>
				</div>
			</div>

			{/* Band count */}
			<div className="preset mb-[10px] grid w-full grid-cols-[max-content_1fr] gap-x-[5px]">
				<select
					className="w-full"
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
					className="w-full"
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
				<div>
					<SliderMicro
						key="intensity"
						label={"POW"}
						value={eq.factor ?? 1}
						sliderMin={0}
						sliderMax={3}
						default={1}
						pass={{ className: "mb-[10px]" }}
						onChange={(newValue) => {
							props.onChange(
								produce(eq, (d) => {
									d.factor = newValue
									delete d.name
								}),
							)
						}}
					/>
				</div>

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

export function formatFreq(value: number) {
	if (value >= 1000) {
		return `${round(value / 1000, 1)}kHz`
	}
	return `${Math.round(value)}hz`
}
