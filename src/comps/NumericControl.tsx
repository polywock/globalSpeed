import { NumericInput } from "./NumericInput"
import { FaAngleDoubleLeft, FaAngleLeft, FaAngleRight, FaAngleDoubleRight } from "react-icons/fa"
import "./NumericControl.scss"

type NumericControlProps = {
  value: number,
  onChange: (newValue: number) => void,
  smallStep: number,
  largeStep: number,
  min?: number,
  max?: number,
  inputNoNull?: boolean,
  inputPlaceholder?: string,
  default?: number,
  rounding?: number
}

export function NumericControl(props: NumericControlProps) {
  
  const handleAddDelta = (delta: number) => {
    let value = props.value ?? props.default
    if (value != null) {
      props.onChange(value + delta)
    }
  }

  return (
    <div className="NumericControl">
      <button onClick={() =>  handleAddDelta(-(props.largeStep ?? 0))}><FaAngleDoubleLeft size={16}/></button>
      <button onClick={() =>  handleAddDelta(-(props.smallStep ?? 0))}><FaAngleLeft size={16}/></button>
      <NumericInput rounding={props.rounding} placeholder={props.inputPlaceholder} noNull={props.inputNoNull} min={props.min} max={props.max} value={props.value} onChange={v => {
        props.onChange(v)
      }}/>
      <button onClick={() =>  handleAddDelta(props.smallStep ?? 0)}><FaAngleRight size={16}/></button>
      <button onMouseDown={() => {}} onClick={() =>  handleAddDelta(props.largeStep ?? 0)}><FaAngleDoubleRight size={16}/></button>
    </div>
  )
}



