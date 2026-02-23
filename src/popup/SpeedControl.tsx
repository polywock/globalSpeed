import { CSSProperties } from "react"
import { getDefaultSpeedPresets } from "@/defaults/constants"
import { MAX_SPEED_CHROMIUM, MIN_SPEED_CHROMIUM } from "../defaults/constants"
import { useStateView } from "../hooks/useStateView"
import { BsMusicNoteList } from "react-icons/bs"
import { produce } from "immer"
import { replaceArgs } from "@/utils/helper"
import { clamp, domRectGetOffset, feedbackText, isFirefox, isMobile } from "@/utils/helper"
import { NumericInput } from "@/comps/NumericInput"
import { FaAngleDoubleLeft, FaAngleDoubleRight, FaAngleLeft, FaAngleRight } from "react-icons/fa"
import "./SpeedControl.css"

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

	let padding = (view.speedPresetPadding ?? 0) * (view.fontSize ?? 1)
	if (isMobile()) padding = Math.max(padding, 10)

	return (
		<div className="SpeedControl" style={{ "--padding": `${padding}px` } as CSSProperties}>
			{/* Presets */}
			<div className="options">
				{presets.map((v, i) => (
					<button
						key={i}
						className={props.speed === v ? "selected" : ""}
						onClick={() => props.onChange(v)}
						onContextMenu={(e) => {
							e.preventDefault()
							if (isFirefox()) return
							const answer = prompt(replaceArgs(gvar.gsm.token.replaceWith, [v.toString()]))
							let resetToDefault = false

							const n = parseFloat(answer ?? "")
							if (isNaN(n)) {
								resetToDefault = true
								answer?.trim() && alert(gvar.gsm.token.invalidNumber)
							}
							if (n > MAX_SPEED_CHROMIUM) {
								resetToDefault = true
								alert(`<= ${MAX_SPEED_CHROMIUM}`)
							}
							if (n < MIN_SPEED_CHROMIUM) {
								resetToDefault = true
								alert(`>= ${MIN_SPEED_CHROMIUM}`)
							}

							setView({
								speedPresets: produce(presets, (d) => {
									d[i] = resetToDefault ? getDefaultSpeedPresets()[i] : n
								}),
							})
						}}
					>
						{v.toFixed(2)}
					</button>
				))}
			</div>

			{/* Controls */}
			<div
				className="NumericControl"
				onWheel={(e) => {
					if (e.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return
					const speedDelta = (e.deltaY / 1080) * -0.15
					props.onChange(clamp(MIN_SPEED_CHROMIUM, MAX_SPEED_CHROMIUM, props.speed + speedDelta))
				}}
			>
				<button onClick={() => handleAddDelta(-largeStep)}>
					<FaAngleDoubleLeft size={"1.14rem"} />
				</button>
				<button onClick={() => handleAddDelta(-smallStep)}>
					<FaAngleLeft size={"1.14rem"} />
				</button>
				<NumericInput
					rounding={2}
					noNull={true}
					min={MIN_SPEED_CHROMIUM}
					max={MAX_SPEED_CHROMIUM}
					value={props.speed}
					onChange={(v) => {
						props.onChange(v)
					}}
				/>
				<button onClick={() => handleAddDelta(smallStep)}>
					<FaAngleRight size={"1.14rem"} />
				</button>
				<button onMouseDown={() => {}} onClick={() => handleAddDelta(largeStep)}>
					<FaAngleDoubleRight size={"1.14rem"} />
				</button>
			</div>

			{/* Slider */}
			{!!view.speedSlider && (
				<div className="slider">
					<BsMusicNoteList
						title={gvar.gsm.command.speedChangesPitch}
						size={"1.2rem"}
						className={`${view.freePitch ? "active" : ""}`}
						onClick={(e: React.MouseEvent<SVGElement>) => {
							if (!view.freePitch) {
								feedbackText(
									gvar.gsm.command.speedChangesPitch,
									domRectGetOffset((e.currentTarget as any as HTMLButtonElement).getBoundingClientRect(), 8, 30),
								)
							}
							setView({ freePitch: !view.freePitch })
						}}
					/>
					<input
						step={0.01}
						type="range"
						min={view.speedSlider.min}
						max={view.speedSlider.max}
						value={props.speed}
						onChange={(e) => {
							props.onChange(e.target.valueAsNumber)
						}}
					/>
				</div>
			)}
		</div>
	)
}
