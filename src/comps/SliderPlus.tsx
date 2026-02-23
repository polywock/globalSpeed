import { ReactNode } from "react"
import { clamp } from "../utils/helper"
import { NumericInput } from "../comps/NumericInput"
import { Slider } from "./Slider"
import { Reset } from "./Reset"
import "./SliderPlus.css"

type SliderPlusProps = {
	label: ReactNode
	value: number
	sliderMin: number
	sliderMax: number
	sliderStep?: number
	min?: number
	max?: number
	default: number
	onChange?: (newValue: number) => void
	noReset?: boolean
}

export function SliderPlus(props: SliderPlusProps) {
	const handleValueChange = (value: number) => {
		props.onChange(clamp(props.min, props.max, value))
	}

	const activated = props.default !== props.value

	return (
		<div className={`SliderPlus ${activated ? "highlight" : ""}`}>
			<div className="header">
				<span>{props.label}</span>
				<NumericInput noNull={true} min={props.min} max={props.max} value={props.value} onChange={handleValueChange} />
				{props.noReset ? <div /> : <Reset active={activated} onClick={() => handleValueChange(props.default)} />}
			</div>
			<Slider
				step={props.sliderStep ?? 0.01}
				min={props.sliderMin}
				max={props.sliderMax}
				value={props.value}
				default={props.default}
				onChange={handleValueChange}
			/>
		</div>
	)
}
