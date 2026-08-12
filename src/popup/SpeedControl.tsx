import { CSSProperties } from "react"
import { BsMusicNoteList } from "react-icons/bs"
import { FaAngleDoubleLeft, FaAngleDoubleRight, FaAngleLeft, FaAngleRight } from "react-icons/fa"
import { NumericInput } from "@/comps/NumericInput"
import { SliderInput } from "@/comps/Slider"
import { Tooltip } from "@/comps/Tooltip"
import { getDefaultSpeedPresets } from "@/defaults/constants"
import { gvar } from "@/globalVar"
import { clamp, cn, isMobile } from "@/utils/helper"
import { MAX_SPEED_CHROMIUM, MIN_SPEED_CHROMIUM } from "../defaults/constants"
import { useStateView } from "../hooks/useStateView"

/** Step buttons and the speed input take a scaled down version of the preset padding. */
const STEP_BUTTON = "button-control px-0 py-[calc(var(--padding)*0.75)] text-3xs"
const STEP_INPUT = "text-sm [&>input]:px-0 [&>input]:py-[calc(var(--padding)*0.75)]"

type SpeedControlProps = {
	onChange: (newSpeed: number) => any
	speed: number
}

export function SpeedControl(props: SpeedControlProps) {
	const [view, setView] = useStateView({
		fontSize: true,
		speedPresets: true,
		speedSmallStep: true,
		speedBigStep: true,
		speedSlider: true,
		freePitch: true,
		speedPresetRows: true,
		speedPresetPadding: true,
	})
	if (!view) return null

	let presets = view.speedPresets?.length === 12 ? view.speedPresets : getDefaultSpeedPresets()
	presets = presets.slice(0, clamp(1, 4, view.speedPresetRows ?? 4) * 3)

	const handleAddDelta = (delta: number) => {
		let value = props.speed
		if (value != null) {
			props.onChange(value + delta)
		}
	}

	const smallStep = view.speedSmallStep || 0.01
	const largeStep = view.speedBigStep || 0.1
	const speedSliderMin = view.speedSlider?.min ?? MIN_SPEED_CHROMIUM
	const speedSliderMax = view.speedSlider?.max ?? MAX_SPEED_CHROMIUM
	const speedSliderProgress = speedSliderMax === speedSliderMin ? 0 : clamp(0, 1, (props.speed - speedSliderMin) / (speedSliderMax - speedSliderMin))

	let padding = (view.speedPresetPadding ?? 0) * (view.fontSize ?? 1)
	if (isMobile()) padding = Math.max(padding, 10)

	return (
		<div className="bg-background text-lg select-none" style={{ "--padding": `${padding}px` } as CSSProperties}>
			{/* Presets */}
			<div className="grid grid-cols-3 justify-items-center gap-0.75">
				{presets.map((v, i) => (
					<button
						key={i}
						className={cn(
							"w-3/4 button-control border-0 px-0 py-(--padding) transition-[transform,background-color,color] duration-170 ease-[cubic-bezier(0,0,0.1,1)]",
							props.speed === v ? "scale-120 rounded-sm bg-tertiary text-tertiary-foreground" : "focus:outline-1 focus:outline-ring",
						)}
						onClick={() => props.onChange(v)}
						onContextMenu={(e) => {
							e.preventDefault()
						}}
					>
						{v.toFixed(2)}
					</button>
				))}
			</div>

			{/* Controls */}
			<div
				className="mt-3.75 grid grid-cols-[50fr_50fr_64fr_50fr_50fr] gap-x-1.25"
				onWheel={(e) => {
					if (e.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return
					const speedDelta = (e.deltaY / 1080) * -0.15
					props.onChange(clamp(MIN_SPEED_CHROMIUM, MAX_SPEED_CHROMIUM, props.speed + speedDelta))
				}}
			>
				<button className={STEP_BUTTON} onClick={() => handleAddDelta(-largeStep)}>
					<FaAngleDoubleLeft size={"1.14rem"} />
				</button>
				<button className={STEP_BUTTON} onClick={() => handleAddDelta(-smallStep)}>
					<FaAngleLeft size={"1.14rem"} />
				</button>
				<NumericInput
					className={STEP_INPUT}
					rounding={2}
					noNull={true}
					min={MIN_SPEED_CHROMIUM}
					max={MAX_SPEED_CHROMIUM}
					value={props.speed}
					onChange={(v) => {
						props.onChange(v)
					}}
				/>
				<button className={STEP_BUTTON} onClick={() => handleAddDelta(smallStep)}>
					<FaAngleRight size={"1.14rem"} />
				</button>
				<button className={STEP_BUTTON} onMouseDown={() => {}} onClick={() => handleAddDelta(largeStep)}>
					<FaAngleDoubleRight size={"1.14rem"} />
				</button>
			</div>

			{/* Slider */}
			{!!view.speedSlider && (
				<div className="mt-3.75 grid grid-cols-[max-content_1fr] items-center gap-x-1.25">
					<Tooltip title={gvar.gsm.command.speedChangesPitch}>
						<BsMusicNoteList
							title={gvar.gsm.command.speedChangesPitch}
							size={"1.2rem"}
							className={view.freePitch ? "text-tertiary opacity-100" : "text-secondary-foreground opacity-50"}
							onClick={(e: React.MouseEvent<SVGElement>) => {
								setView({ freePitch: !view.freePitch })
							}}
						/>
					</Tooltip>
					<SliderInput
						step={0.01}
						min={speedSliderMin}
						max={speedSliderMax}
						value={props.speed}
						style={{ "--slider-progress": `${speedSliderProgress * 100}%` } as CSSProperties}
						onChange={(e) => {
							props.onChange(e.target.valueAsNumber)
						}}
					/>
				</div>
			)}
		</div>
	)
}
