import React from "react"
import { NumericInput } from "./NumericInput"
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
  default?: number  
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
      <button onClick={() =>  handleAddDelta(-(props.largeStep ?? 0))}>&lt;&lt;</button>
      <button onClick={() =>  handleAddDelta(-(props.smallStep ?? 0))}>&lt;</button>
      <NumericInput placeholder={props.inputPlaceholder} noNull={props.inputNoNull} min={props.min} max={props.max} value={props.value} onChange={v => {
        props.onChange(v)
      }}/>
      <button onClick={() =>  handleAddDelta(props.smallStep ?? 0)}>&gt;</button>
      <button onMouseDown={() => {}} onClick={() =>  handleAddDelta(props.largeStep ?? 0)}>&gt;&gt;</button>
    </div>
  )
}



