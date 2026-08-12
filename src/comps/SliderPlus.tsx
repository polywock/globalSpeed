import { ReactNode } from "react"
import { clamp, cn } from "@/utils/helper"
import { NumericInput } from "../comps/NumericInput"
import { Reset } from "./Reset"
import { Slider } from "./Slider"

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
	className?: string
}

export function SliderPlus(props: SliderPlusProps) {
	const handleValueChange = (value: number) => {
		props.onChange(clamp(props.min, props.max, value))
	}

	const activated = props.default !== props.value

	return (
		<div className={cn("bg-background", props.className)}>
			<div className="mb-0.5 grid grid-cols-[1fr_60px_max-content] items-center gap-x-1.25">
				<span className={cn("self-center", activated ? "font-semibold text-tertiary" : "font-normal text-foreground")}>{props.label}</span>
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
