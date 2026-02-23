import { NumericInput } from "./NumericInput"
import { domRectGetOffset, feedbackText } from "@/utils/helper"
import "./Minmax.css"

type MinmaxProps = {
  onChange: (min: number, max: number) => void 
  min: number,
  max: number,
  defaultMin: number,
  defaultMax: number,
  realMin?: number,
  realMax?: number,
  noNull?: boolean
}

export function Minmax (props: MinmaxProps) {
  return <div className="Minmax">
     <NumericInput 
        value={props.min} 
        onChange={v => {
          props.onChange(v, props.max)
        }}
        min={props.realMin}
        max={props.realMax}
        noNull={props.noNull}
        placeholder={props.defaultMin?.toString()}
        onFocus={e => {
          feedbackText(gvar.gsm.token.min, domRectGetOffset((e.currentTarget as any).getBoundingClientRect(), 20, -50, true))
        }}
    />
    <NumericInput 
        value={props.max} 
        onChange={v => {
            props.onChange(props.min, v)
        }}
        min={props.realMin}
        max={props.realMax}
        noNull={props.noNull}
        placeholder={props.defaultMax?.toString()}
        onFocus={e => {
          feedbackText(gvar.gsm.token.max, domRectGetOffset((e.currentTarget as any).getBoundingClientRect(), 20, -50, true))
        }}
    />

  </div>
}