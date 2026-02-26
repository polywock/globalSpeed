import { ReactNode } from "react"
import { NumericInput } from "../comps/NumericInput"
import { clamp } from "../utils/helper"
import { Reset } from "./Reset"
import { Slider } from "./Slider"
import "./SliderMicro.css"

type SliderMicroProps = {
	label?: ReactNode
	value: number
	sliderMin: number
	sliderMax: number
	sliderStep?: number
	min?: number
	max?: number
	default: number
	onChange?: (newValue: number) => void
	withInput?: boolean
	pass?: React.ComponentProps<"div">
}

export function SliderMicro(props: SliderMicroProps) {
	const handleValueChange = (value: number) => {
		props.onChange(clamp(props.min, props.max, value))
	}

	const activated = props.default !== props.value

	return (
		<div
			{...(props.pass ?? {})}
			className={`SliderMicro ${props.label ? "withLabel" : ""} ${props.withInput ? "withInput" : ""} ${activated ? "highlight" : ""}`}
		>
			{props.label != null && <span>{props.label}</span>}
			<Slider
				step={props.sliderStep ?? 0.01}
				min={props.sliderMin}
				max={props.sliderMax}
				value={props.value}
				default={props.default}
				onChange={handleValueChange}
			/>
			{props.withInput && (
				<NumericInput
					value={props.value}
					min={props.min}
					max={props.max}
					noNull={true}
					onChange={(v) => {
						handleValueChange(v)
					}}
				/>
			)}
			<Reset active={activated} onClick={() => handleValueChange(props.default)} />
		</div>
	)
}
