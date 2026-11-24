import { useState } from "react"
import { FaPowerOff } from "react-icons/fa"
import { GoArrowDown, GoArrowUp, GoX } from "react-icons/go"
import { Reset } from "@/comps/Reset"
import { Select } from "@/comps/Select"
import { Slider } from "@/comps/Slider"
import { SliderMicro } from "@/comps/SliderMicro"
import { Toggle } from "@/comps/Toggle"
import { Tooltip } from "@/comps/Tooltip"
import { Button } from "@/comps/ui/button"
import { gvar } from "@/globalVar"
import { AudioEffect, AudioEffectType, FrequencyFilterType } from "@/types"
import {
	AUDIO_EFFECT_PARAMS,
	AUDIO_EFFECT_PRESETS,
	AUDIO_EFFECT_TYPES,
	createAudioEffect,
	FILTER_DEFAULTS,
	FREQUENCY_FILTER_TYPES,
	FREQUENCY_MAX,
	FREQUENCY_MIN,
	findAudioPreset,
	getEffectDefaults,
	isShelfFilter,
	STEREO_EFFECT_TYPES,
} from "@/utils/audioFx"
import { cn, moveItem, produce } from "@/utils/helper"
import { EqualizerControl, formatFreq } from "./EqualizerControl"
import { InsertItcButton } from "./InsertItcButton"

export function getAudioEffectName(type: AudioEffectType) {
	const a = gvar.gsm.audio
	const names: { [key in AudioEffectType]: string } = {
		eq: a.equalizer,
		freqFilter: a.frequencyFilter,
		compressor: a.compressor,
		delay: gvar.gsm.command.afxDelay,
		reverb: a.reverb,
		modulation: a.modulation,
		distortion: a.distortion,
		pan: gvar.gsm.command.afxPan,
		width: a.width,
	}
	return names[type]
}

type SliderSpec = {
	key: "q" | "gain" | "threshold" | "ratio" | "size" | "rate" | "pitchDepth" | "volumeDepth" | "delayTime" | "feedback" | "mix" | "drive" | "bits" | "downsample" | "pan" | "width"
	/** Single-slider effects go unlabeled; the card title names them. */
	label?: () => string
	sliderMin: number
	sliderMax: number
	step: number
	min?: number
	max?: number
}

const MIX: SliderSpec = { key: "mix", label: () => gvar.gsm.audio.mix, sliderMin: 0, sliderMax: 1, step: 0.01 }
const Q: SliderSpec = { key: "q", label: () => "Q", sliderMin: 0.1, sliderMax: 20, step: 0.01, min: 0.0001, max: 30 }
const RESONANCE: SliderSpec = { ...Q, label: () => gvar.gsm.audio.resonance, sliderMax: 10 }
const GAIN: SliderSpec = { key: "gain", label: () => gvar.gsm.audio.gain, sliderMin: -12, sliderMax: 12, step: 0.5, min: -24, max: 24 }

/** Low/high-pass talk in cutoff and resonance; band-pass and notch in center frequency and width (Q); shelves in frequency and gain. */
const isPassFilter = (effect: AudioEffect) => (effect.filterType ?? "lowpass") === "lowpass" || effect.filterType === "highpass"

function getFilterTypeName(type: FrequencyFilterType) {
	const a = gvar.gsm.audio
	return { lowpass: a.lowpass, highpass: a.highpass, bandpass: a.bandpass, notch: a.notch, lowshelf: a.lowshelf, highshelf: a.highshelf }[type]
}

const SLIDERS: { [key in AudioEffectType]?: SliderSpec[] } = {
	compressor: [
		{ key: "threshold", label: () => gvar.gsm.audio.threshold, sliderMin: -60, sliderMax: 0, step: 1, min: -100, max: 0 },
		{ key: "ratio", label: () => gvar.gsm.audio.ratio, sliderMin: 1, sliderMax: 20, step: 0.1 },
	],
	reverb: [{ key: "size", label: () => gvar.gsm.token.size, sliderMin: 0.1, sliderMax: 10, step: 0.1 }, MIX],
	modulation: [
		// The slider covers the musical range; faster can still be typed in.
		{ key: "rate", label: () => gvar.gsm.audio.rate, sliderMin: 0.1, sliderMax: 6, step: 0.1, max: 20 },
		{ key: "pitchDepth", label: () => gvar.gsm.audio.pitchWobble, sliderMin: 0, sliderMax: 1, step: 0.01 },
		{ key: "volumeDepth", label: () => gvar.gsm.audio.volumeWobble, sliderMin: 0, sliderMax: 1, step: 0.01 },
		{ key: "delayTime", label: () => gvar.gsm.audio.delayTime, sliderMin: 1, sliderMax: 30, step: 0.5 },
		{ key: "feedback", label: () => gvar.gsm.audio.feedback, sliderMin: 0, sliderMax: 0.9, step: 0.01 },
		MIX,
	],
	distortion: [
		{ key: "drive", label: () => gvar.gsm.audio.drive, sliderMin: 0, sliderMax: 100, step: 1 },
		{ key: "bits", label: () => gvar.gsm.audio.bits, sliderMin: 1, sliderMax: 16, step: 1 },
		{ key: "downsample", label: () => gvar.gsm.audio.downsample, sliderMin: 1, sliderMax: 40, step: 1 },
		MIX,
	],
	pan: [{ key: "pan", sliderMin: -1, sliderMax: 1, step: 0.01 }],
	// The slider covers the useful range; wider can still be typed in.
	width: [{ key: "width", sliderMin: 0, sliderMax: 2, step: 0.01, max: 4 }],
}

type AudioEffectListProps = {
	effects: AudioEffect[]
	onChange: (effects: AudioEffect[]) => void
	/** The right side of a split can't hold stereo effects; the left side's apply to the combined output. */
	allowStereo: boolean
	showItc: boolean
}

export function AudioEffectList(props: AudioEffectListProps) {
	// Skip types this version doesn't know, from a newer or older build, so one stray effect can't break the popup.
	// They're dropped on the next edit.
	const effects = props.effects.filter((e) => AUDIO_EFFECT_TYPES.includes(e.type))
	const types = AUDIO_EFFECT_TYPES.filter((t) => props.allowStereo || !STEREO_EFFECT_TYPES.has(t))
	const [type, setType] = useState<AudioEffectType>("eq")
	const selected = types.includes(type) ? type : types[0]

	const update = (id: string, fn: (d: AudioEffect) => void) => {
		props.onChange(
			produce(effects, (d) => {
				const effect = d.find((e) => e.id === id)
				if (effect) fn(effect)
			}),
		)
	}

	return (
		<div className="mt-3.75 border-t border-border">
			<div className="mt-1.5 text-center text-sm opacity-50">{gvar.gsm.audio.effects}</div>
			{effects.map((effect) => (
				<AudioEffectItem
					key={effect.id}
					effect={effect}
					// The page slider, like shortcuts, controls the first effect of its type.
					showItc={props.showItc && effects.find((e) => e.type === effect.type) === effect}
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
							Object.assign(d, { ...getEffectDefaults(d), id: d.id, enabled: d.enabled })
						})
					}
					onMove={(down) => props.onChange(produce(effects, (d) => void moveItem(d, (v) => v.id === effect.id, down ? "D" : "U")))}
					onRemove={() => props.onChange(effects.filter((e) => e.id !== effect.id))}
				/>
			))}
			<div className="mt-2.5 mb-3.75 flex gap-x-2.5">
				<Select
					aria-label={gvar.gsm.audio.effects}
					value={selected}
					onChanged={(v) => setType(v as AudioEffectType)}
					options={types.map((t) => ({ key: t, value: getAudioEffectName(t) }))}
				/>
				<Button onClick={() => props.onChange([...effects, createAudioEffect(selected)])}>{gvar.gsm.token.create}</Button>
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
	const defaults = getEffectDefaults(effect)
	const isDefault =
		effect.type === "eq"
			? !effect.eq.values.some((v) => v !== 0) && (effect.eq.factor ?? 1) === 1
			: AUDIO_EFFECT_PARAMS[effect.type].every((k) => (effect[k] ?? defaults[k]) === defaults[k])
	const itcCommand = ({ delay: "afxDelay", pan: "afxPan" } as const)[effect.type as "delay" | "pan"]
	const presets = AUDIO_EFFECT_PRESETS[effect.type]
	const isFreqFilter = effect.type === "freqFilter"
	const sliders = isFreqFilter
		? [isShelfFilter(effect.filterType ?? "lowpass") ? GAIN : isPassFilter(effect) ? RESONANCE : Q]
		: (SLIDERS[effect.type] ?? [])
	// Single-slider effects already reset from their slider.
	const headerReset = effect.type === "eq" || isFreqFilter || sliders.length > 1

	return (
		<div className="mt-3.75 rounded-lg border border-border p-2.5">
			<div
				className={cn(
					"mb-2.5 grid items-center gap-x-1.25 text-xl",
					headerReset ? "grid-cols-[max-content_1fr_repeat(4,max-content)]" : "grid-cols-[max-content_1fr_repeat(3,max-content)]",
				)}
			>
				<div className="hover:opacity-90">
					<Tooltip title={effect.enabled ? gvar.gsm.token.off : gvar.gsm.token.on}>
						{/* The icon variant sets its own text color, so the on/off color has to go on the button. */}
						<Button
							variant="icon"
							size="icon-auto"
							className={effect.enabled ? "text-primary" : "text-muted-foreground"}
							aria-pressed={effect.enabled}
							onClick={props.onToggle}
						>
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

			{presets && (
				<div className="mb-2.5 grid grid-cols-[80px_1fr] items-center gap-x-1.25">
					<span>{gvar.gsm.filter.otherFilters.presets}</span>
					<Select
						aria-label={gvar.gsm.filter.otherFilters.presets}
						value={findAudioPreset(effect) ?? ""}
						onChanged={(id) => {
							const preset = presets.find((p) => p.id === id)
							if (!preset) return
							// Start from the defaults (of the preset's filter type), so values the preset doesn't list don't linger.
							const defaults = getEffectDefaults({ ...effect, ...preset.values })
							props.onChange((d) => {
								for (const k of AUDIO_EFFECT_PARAMS[d.type]) (d as any)[k] = defaults[k]
								Object.assign(d, preset.values)
							})
						}}
						options={[{ key: "", value: "---" }, ...presets.map((p) => ({ key: p.id, value: gvar.gsm.audio.presets[p.id] }))]}
					/>
				</div>
			)}

			{effect.type === "eq" && <EqualizerControl value={effect.eq} onChange={(eq) => props.onChange((d) => void (d.eq = eq))} />}

			{isFreqFilter && (
				<Select
					className="mb-2.5 w-full"
					aria-label={getAudioEffectName("freqFilter")}
					value={effect.filterType ?? "lowpass"}
					onChanged={(v) =>
						props.onChange((d) => {
							d.filterType = v as FrequencyFilterType
							Object.assign(d, FILTER_DEFAULTS[d.filterType])
						})
					}
					options={FREQUENCY_FILTER_TYPES.map((t) => ({ key: t, value: getFilterTypeName(t) }))}
				/>
			)}

			{isFreqFilter && (
				<FrequencySlider
					label={isPassFilter(effect) ? gvar.gsm.audio.cutoff : gvar.gsm.audio.frequency}
					value={effect.frequency ?? defaults.frequency}
					defaultValue={defaults.frequency}
					onChange={(v) => props.onChange((d) => void (d.frequency = v))}
				/>
			)}

			{sliders.map((spec) => (
				<SliderMicro
					key={spec.key}
					label={spec.label?.()}
					value={effect[spec.key] ?? defaults[spec.key]}
					sliderMin={spec.sliderMin}
					sliderMax={spec.sliderMax}
					sliderStep={spec.step}
					min={spec.min ?? spec.sliderMin}
					max={spec.max ?? spec.sliderMax}
					default={defaults[spec.key]}
					withInput={true}
					// Matches the cutoff/frequency row, which has no reset of its own.
					noReset={isFreqFilter}
					onChange={(v) => props.onChange((d) => void (d[spec.key] = v))}
				/>
			))}

			{effect.type === "delay" && (
				<>
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
					<div className="mt-1.5 grid grid-cols-[1fr_max-content] items-center gap-x-1.25">
						<Tooltip title={gvar.gsm.token.mergeBoth}>
							{/* Grid items stretch, so shrink it to its text to keep the tooltip on the words. */}
							<span className="justify-self-start">{gvar.gsm.audio.hearBoth}</span>
						</Tooltip>
						<Toggle
							aria-label={gvar.gsm.token.mergeBoth}
							value={!!effect.delayMerge}
							onChange={(on) => props.onChange((d) => (on ? (d.delayMerge = true) : delete d.delayMerge))}
						/>
					</div>
				</>
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
