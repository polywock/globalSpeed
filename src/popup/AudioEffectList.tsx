import { useState } from "react"
import { FaPowerOff } from "react-icons/fa"
import { GoArrowDown, GoArrowUp, GoX } from "react-icons/go"
import { LuMerge } from "react-icons/lu"
import { Reset } from "@/comps/Reset"
import { Select } from "@/comps/Select"
import { Slider } from "@/comps/Slider"
import { SliderMicro } from "@/comps/SliderMicro"
import { ToggleButton } from "@/comps/ToggleButton"
import { Tooltip } from "@/comps/Tooltip"
import { Button } from "@/comps/ui/button"
import { gvar } from "@/globalVar"
import { AudioEffect, AudioEffectType } from "@/types"
import { AUDIO_EFFECT_TYPES, createAudioEffect, FREQUENCY_MAX, FREQUENCY_MIN, Q_DEFAULT } from "@/utils/audioFx"
import { cn, moveItem, produce } from "@/utils/helper"
import { EqualizerControl, formatFreq } from "./EqualizerControl"
import { InsertItcButton } from "./InsertItcButton"

export function getAudioEffectName(type: AudioEffectType) {
	if (type === "eq") return gvar.gsm.audio.equalizer
	if (type === "lowpass") return gvar.gsm.audio.lowpass
	if (type === "highpass") return gvar.gsm.audio.highpass
	if (type === "delay") return gvar.gsm.command.afxDelay
	return gvar.gsm.command.afxPan
}

type AudioEffectListProps = {
	effects: AudioEffect[]
	onChange: (effects: AudioEffect[]) => void
	/** The right side of a split can't pan; pan applies to the combined output from the left side. */
	allowPan: boolean
	showItc: boolean
}

export function AudioEffectList(props: AudioEffectListProps) {
	const types = AUDIO_EFFECT_TYPES.filter((t) => props.allowPan || t !== "pan")
	const [type, setType] = useState<AudioEffectType>("eq")
	const selected = types.includes(type) ? type : types[0]

	const update = (id: string, fn: (d: AudioEffect) => void) => {
		props.onChange(
			produce(props.effects, (d) => {
				const effect = d.find((e) => e.id === id)
				if (effect) fn(effect)
			}),
		)
	}

	return (
		<div className="mt-3.75 border-t border-border">
			<div className="mt-1.5 text-center text-sm opacity-50">{gvar.gsm.audio.effects}</div>
			{props.effects.map((effect) => (
				<AudioEffectItem
					key={effect.id}
					effect={effect}
					// The page slider, like shortcuts, controls the first effect of its type.
					showItc={props.showItc && props.effects.find((e) => e.type === effect.type) === effect}
					// Editing an effect turns it on.
					onChange={(fn) =>
						update(effect.id, (d) => {
							fn(d)
							d.enabled = true
						})
					}
					onToggle={() => update(effect.id, (d) => void (d.enabled = !d.enabled))}
					onReset={() =>
						update(effect.id, (d) => {
							Object.assign(d, { ...createAudioEffect(d.type), id: d.id, enabled: d.enabled })
						})
					}
					onMove={(down) => props.onChange(produce(props.effects, (d) => void moveItem(d, (v) => v.id === effect.id, down ? "D" : "U")))}
					onRemove={() => props.onChange(props.effects.filter((e) => e.id !== effect.id))}
				/>
			))}
			<div className="mt-2.5 mb-3.75 flex gap-x-2.5">
				<Select
					aria-label={gvar.gsm.audio.effects}
					value={selected}
					onChanged={(v) => setType(v as AudioEffectType)}
					options={types.map((t) => ({ key: t, value: getAudioEffectName(t) }))}
				/>
				<Button onClick={() => props.onChange([...props.effects, createAudioEffect(selected)])}>{gvar.gsm.token.create}</Button>
			</div>
		</div>
	)
}

type AudioEffectItemProps = {
	effect: AudioEffect
	showItc: boolean
	onChange: (fn: (d: AudioEffect) => void) => void
	onToggle: () => void
	onReset: () => void
	onMove: (down: boolean) => void
	onRemove: () => void
}

function AudioEffectItem(props: AudioEffectItemProps) {
	const { effect } = props
	const name = getAudioEffectName(effect.type)
	const defaults = createAudioEffect(effect.type)
	const isDefault =
		effect.type === "eq"
			? !effect.eq.values.some((v) => v !== 0) && (effect.eq.factor ?? 1) === 1
			: effect.frequency === defaults.frequency &&
				effect.q === defaults.q &&
				effect.delay === defaults.delay &&
				!effect.delayMerge &&
				effect.pan === defaults.pan
	const itcCommand = effect.type === "delay" ? "afxDelay" : effect.type === "pan" ? "afxPan" : null
	// Single-slider effects already reset from their slider.
	const headerReset = effect.type === "eq" || effect.type === "lowpass" || effect.type === "highpass"

	return (
		<div className="mt-3.75 rounded-lg border border-border p-2.5">
			<div
				className={cn(
					"mb-2.5 grid items-center gap-x-1.25 text-xl",
					headerReset ? "grid-cols-[max-content_1fr_repeat(4,max-content)]" : "grid-cols-[max-content_1fr_repeat(3,max-content)]",
				)}
			>
				<div className={cn("hover:opacity-90", effect.enabled ? "text-primary" : "text-muted-foreground")}>
					<Tooltip title={effect.enabled ? gvar.gsm.token.off : gvar.gsm.token.on}>
						<Button variant="icon" size="icon-auto" aria-pressed={effect.enabled} onClick={props.onToggle}>
							<FaPowerOff size="1.21rem" />
						</Button>
					</Tooltip>
				</div>
				<div className="flex items-center">
					<span>{name}</span>
					{props.showItc && itcCommand && <InsertItcButton command={itcCommand} className="ml-2.5" />}
				</div>
				{headerReset && <Reset active={!isDefault} onClick={props.onReset} />}
				<Tooltip title={gvar.gsm.token.moveUp}>
					<Button variant="icon" size="icon-auto" onClick={() => props.onMove(false)}>
						<GoArrowUp size="1.42rem" />
					</Button>
				</Tooltip>
				<Tooltip title={gvar.gsm.token.moveDown}>
					<Button variant="icon" size="icon-auto" onClick={() => props.onMove(true)}>
						<GoArrowDown size="1.42rem" />
					</Button>
				</Tooltip>
				<Tooltip title={gvar.gsm.token.delete}>
					<Button variant="icon" size="icon-auto" onClick={props.onRemove}>
						<GoX size="1.6rem" />
					</Button>
				</Tooltip>
			</div>

			{effect.type === "eq" && <EqualizerControl value={effect.eq} onChange={(eq) => props.onChange((d) => void (d.eq = eq))} />}

			{(effect.type === "lowpass" || effect.type === "highpass") && (
				<>
					<FrequencySlider
						label={gvar.gsm.audio.cutoff}
						value={effect.frequency ?? defaults.frequency}
						defaultValue={defaults.frequency}
						onChange={(v) => props.onChange((d) => void (d.frequency = v))}
					/>
					<SliderMicro
						label={gvar.gsm.audio.resonance}
						value={effect.q ?? Q_DEFAULT}
						sliderMin={0.1}
						sliderMax={10}
						sliderStep={0.01}
						min={0.0001}
						max={30}
						default={Q_DEFAULT}
						withInput={true}
						onChange={(v) => props.onChange((d) => void (d.q = v))}
					/>
				</>
			)}

			{effect.type === "delay" && (
				<div className="grid grid-cols-[1fr_max-content] items-center gap-x-1.25">
					<SliderMicro
						value={effect.delay ?? 0}
						sliderMin={0}
						sliderMax={5}
						min={0}
						max={179}
						default={defaults.delay}
						withInput={true}
						onChange={(v) => props.onChange((d) => void (d.delay = v))}
					/>
					<Tooltip title={gvar.gsm.token.mergeBoth}>
						<ToggleButton
							active={!!effect.delayMerge}
							className="p-1 text-sm"
							onClick={() => props.onChange((d) => (d.delayMerge ? delete d.delayMerge : (d.delayMerge = true)))}
						>
							<LuMerge className="size-3" />
						</ToggleButton>
					</Tooltip>
				</div>
			)}

			{effect.type === "pan" && (
				<SliderMicro
					value={effect.pan ?? 0}
					sliderMin={-1}
					sliderMax={1}
					min={-1}
					max={1}
					default={0}
					withInput={true}
					onChange={(v) => props.onChange((d) => void (d.pan = v))}
				/>
			)}
		</div>
	)
}

const LOG_MIN = Math.log10(FREQUENCY_MIN)
const LOG_MAX = Math.log10(FREQUENCY_MAX)

/** Frequencies are heard logarithmically, so the slider moves through octaves evenly. */
function FrequencySlider(props: { label: string; value: number; defaultValue: number; onChange: (v: number) => void }) {
	return (
		<div className="mb-0.5 grid grid-cols-[80px_1fr_60px] items-center gap-x-1.25">
			<span>{props.label}</span>
			<Slider
				aria-label={props.label}
				min={LOG_MIN}
				max={LOG_MAX}
				step={0.001}
				value={Math.log10(props.value)}
				default={Math.log10(props.defaultValue)}
				onChange={(v) => props.onChange(Math.round(10 ** v))}
			/>
			<span className="text-right">{formatFreq(props.value)}</span>
		</div>
	)
}
