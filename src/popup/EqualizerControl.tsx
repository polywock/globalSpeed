import equal from "fast-deep-equal"
import { useMemo } from "react"
import { FaPowerOff } from "react-icons/fa"
import { LuSave, LuTrash } from "react-icons/lu"
import { Select } from "@/comps/Select"
import { Tooltip } from "@/comps/Tooltip"
import { Button } from "@/comps/ui/button"
import { eqPresetKey, getEqPresets, isBuiltInEqPreset, normalizeEqPresetOverlay } from "@/defaults/eqPresets"
import { gvar } from "@/globalVar"
import { areYouSure, cn, produce, round } from "@/utils/helper"
import { Reset } from "../comps/Reset"
import { SliderMicro } from "../comps/SliderMicro"
import { getDefaultEq } from "../defaults"
import { useStateView } from "../hooks/useStateView"
import { AudioFx, EqPreset } from "../types"

type EqualizerControlProps = {
	value: AudioFx["eq"]
	onChange: (newEq: AudioFx["eq"]) => void
	className?: string
}

// Presets are selected by name, so a key with a colon in it cannot collide with one.
const RESET_KEY = "reset:"

export function EqualizerControl(props: EqualizerControlProps) {
	const eq = props.value
	const bandCount = eq.values.length
	const [presetView, setPresetView] = useStateView({ eqPresetOverlay: true })

	const overlay = presetView?.eqPresetOverlay
	const presets = useMemo(() => getEqPresets(bandCount, overlay), [overlay, bandCount])

	// A name no longer in the list leaves the select blank, e.g. a preset deleted from another popup.
	const selected = eq.name && presets.some((v) => v.name === eq.name) ? eq.name : ""

	const isEmpty = useMemo(() => equal(eq || getDefaultEq(), getDefaultEq()), [eq])

	const savePreset = (rawName: string) => {
		const name = rawName.trim()
		if (!name) return
		const preset: EqPreset = { name, values: [...eq.values] }
		const added = overlay?.added ?? []
		// Re-saving a name updates that preset rather than duplicating it.
		const idx = added.findIndex((v) => v.name === name && v.values.length === bandCount)
		setPresetView({
			eqPresetOverlay: normalizeEqPresetOverlay({
				added: idx >= 0 ? added.map((v, i) => (i === idx ? preset : v)) : [...added, preset],
				removed: overlay?.removed,
			}),
		})
		props.onChange(
			produce(eq, (d) => {
				d.enabled = true
				d.name = name
			}),
		)
	}

	const resetPresets = () => {
		setPresetView({ eqPresetOverlay: null })
		// A built-in the user had deleted comes back under its own name, so only their own selection is stale.
		if (eq.name && !isBuiltInEqPreset(bandCount, eq.name)) {
			props.onChange(
				produce(eq, (d) => {
					delete d.name
				}),
			)
		}
	}

	const deletePreset = () => {
		if (!selected) return
		const key = eqPresetKey(bandCount, selected)
		const removed = overlay?.removed ?? []
		setPresetView({
			eqPresetOverlay: normalizeEqPresetOverlay({
				added: (overlay?.added ?? []).filter((v) => !(v.name === selected && v.values.length === bandCount)),
				// A built-in can only be hidden, never dropped, so without the tombstone it would come straight back.
				removed: isBuiltInEqPreset(bandCount, selected) && !removed.includes(key) ? [...removed, key] : removed,
			}),
		})
		props.onChange(
			produce(eq, (d) => {
				delete d.name
			}),
		)
	}

	return (
		<div className={cn("mt-3.75 rounded-lg border border-border p-2.5 select-none", props.className)}>
			<div className="mb-2.5 grid grid-cols-[max-content_1fr_max-content] items-center gap-x-1.25 text-xl">
				<div className={eq.enabled ? "text-primary" : "text-muted-foreground"}>
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
				<div>{gvar.gsm.audio.equalizer}</div>
				<div className="justify-self-end">
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
			<div className="mb-2.5 grid w-full grid-cols-[max-content_1fr_max-content] items-center gap-x-1.25">
				<Select
					className="w-full"
					value={bandCount.toString()}
					onChanged={(newValue) => {
						const newBandCount = parseInt(newValue)
						if (newBandCount === bandCount) return
						props.onChange(
							produce(eq, (d) => {
								d.values = Array(newBandCount).fill(0)
								delete d.name
							}),
						)
					}}
					options={[
						{ key: "10", value: "10" },
						{ key: "20", value: "20" },
						{ key: "30", value: "30" },
					]}
				/>

				{/* Presets */}
				<Select
					className="w-full"
					value={selected}
					onChanged={(newValue) => {
						if (newValue === RESET_KEY) {
							if (areYouSure()) resetPresets()
							return
						}
						if (newValue === "") {
							props.onChange(
								produce(eq, (d) => {
									delete d.name
								}),
							)
							return
						}
						const target = presets.find((v) => v.name === newValue)
						if (!target) return
						props.onChange(
							produce(eq, (d) => {
								d.enabled = true
								d.name = target.name
								d.values = [...target.values]
							}),
						)
					}}
					options={[
						{ key: "", value: "---" },
						...presets.map((v) => ({ key: v.name, value: v.name })),
						// Nothing to reset until the user has actually changed the preset list.
						...(overlay ? [{ key: RESET_KEY, value: gvar.gsm.audio.resetPresets }] : []),
					]}
				/>

				{/* Delete what is selected, or save the curve once it no longer matches a preset. */}
				{selected ? (
					<Tooltip title={gvar.gsm.audio.deletePreset}>
						<Button size="control" aria-label={gvar.gsm.audio.deletePreset} className="text-secondary-foreground" onClick={deletePreset}>
							<LuTrash className="size-4" />
						</Button>
					</Tooltip>
				) : (
					<Tooltip title={gvar.gsm.audio.savePreset}>
						<Button
							size="control"
							aria-label={gvar.gsm.audio.savePreset}
							className="text-secondary-foreground"
							onClick={() => {
								savePreset(window.prompt(gvar.gsm.audio.presetName) ?? "")
							}}
						>
							<LuSave className="size-4" />
						</Button>
					</Tooltip>
				)}
			</div>

			<div>
				{/* Power */}
				<div>
					<SliderMicro
						key="intensity"
						label={"POW"}
						value={eq.factor ?? 1}
						sliderMin={0}
						sliderMax={3}
						default={1}
						pass={{ className: "mb-2.5" }}
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
					const freq = 31.25 * 2 ** (i / Math.round(bandCount / 10))
					return (
						<SliderMicro
							key={freq.toString()}
							label={`${i === 0 ? "<" : i === bandCount - 1 ? ">" : ""}${formatFreq(freq)}`}
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
