import { gvar } from "@/globalVar"
import { NumericInput } from "./NumericInput"
import { Tooltip } from "./Tooltip"

type MinmaxProps = {
	onChange: (min: number, max: number) => void
	min: number
	max: number
	defaultMin: number
	defaultMax: number
	realMin?: number
	realMax?: number
	noNull?: boolean
}

export function Minmax(props: MinmaxProps) {
	return (
		<div className="Minmax grid grid-cols-[1fr_1fr] gap-x-[5px]">
			<Tooltip title={gvar.gsm.token.min}>
				<NumericInput
					value={props.min}
					onChange={(v) => {
						props.onChange(v, props.max)
					}}
					min={props.realMin}
					max={props.realMax}
					noNull={props.noNull}
					placeholder={props.defaultMin?.toString()}
				/>
			</Tooltip>
			<Tooltip title={gvar.gsm.token.max}>
				<NumericInput
					value={props.max}
					onChange={(v) => {
						props.onChange(props.min, v)
					}}
					min={props.realMin}
					max={props.realMax}
					noNull={props.noNull}
					placeholder={props.defaultMax?.toString()}
				/>
			</Tooltip>
		</div>
	)
}
