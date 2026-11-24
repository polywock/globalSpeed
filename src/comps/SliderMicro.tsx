import { ReactNode, useId } from "react"
import { clamp, cn } from "@/utils/helper"
import { NumericInput } from "../comps/NumericInput"
import { FieldLabelContext } from "./FieldLabel"
import { Reset } from "./Reset"
import { Slider } from "./Slider"

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
	/** Leave out the reset button, e.g. when the card's header reset already covers this slider. */
	noReset?: boolean
	pass?: React.ComponentProps<"div">
}

export function SliderMicro(props: SliderMicroProps) {
	const { className, ...pass } = props.pass ?? {}
	const labelId = useId()
	const handleValueChange = (value: number) => {
		props.onChange(clamp(props.min, props.max, value))
	}

	const activated = props.default !== props.value
	const gridColumns = props.noReset
		? props.label
			? props.withInput
				? "grid-cols-[80px_1fr_60px]"
				: "grid-cols-[80px_1fr]"
			: props.withInput
				? "grid-cols-[1fr_60px]"
				: "grid-cols-1"
		: props.label
			? props.withInput
				? "grid-cols-[80px_1fr_60px_max-content]"
				: "grid-cols-[80px_1fr_max-content]"
			: props.withInput
				? "grid-cols-[1fr_60px_max-content]"
				: "grid-cols-[1fr_max-content]"

	const content = (
		<div
			{...pass}
			data-slot="slider-micro"
			className={cn("mb-0.5 grid items-center gap-x-1.25", gridColumns, props.label && "withLabel", props.withInput && "withInput", className)}
		>
			{props.label != null && (
				<span id={labelId} className={activated ? "font-semibold text-primary" : "font-normal text-foreground"}>
					{props.label}
				</span>
			)}
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
			{!props.noReset && <Reset active={activated} onClick={() => handleValueChange(props.default)} />}
		</div>
	)
	// Without its own label it keeps the surrounding field's label.
	return props.label != null ? <FieldLabelContext.Provider value={labelId}>{content}</FieldLabelContext.Provider> : content
}
