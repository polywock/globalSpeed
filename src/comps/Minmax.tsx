import { NumericInput } from "./NumericInput"
import { Tooltip } from "./Tooltip"
import "./Minmax.css"

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
		<div className="Minmax">
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
