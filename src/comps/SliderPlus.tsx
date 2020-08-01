import React, { useMemo } from "react"
import { clamp } from "../utils/helper"
import { NumericInput } from "../comps/NumericInput"
import { GiAnticlockwiseRotation } from "react-icons/gi"
import { Move } from "./Move"
import { Slider } from "./Slider"
import "./SliderPlus.scss"

type SliderPlusProps = {
  label: React.ReactNode,
  value: number,
  sliderMin: number,
  sliderMax: number,
  sliderStep?: number,
  min?: number,
  max?: number,
  default: number,
  onChange?: (newValue: number) => void,
  onMove?: (down: boolean) => void,
}


export function SliderPlus(props: SliderPlusProps) {

  const env = useMemo(() => ({props} as {props: SliderPlusProps}), [])
  env.props = props 
  
  const handleValueChange = (value: number) => {
    props.onChange(clamp(props.min, props.max, value))
  }

  return <div className={`SliderPlus ${props.default !== props.value ? "highlight" : ""}`}>
    {props.onMove ? <Move onMove={props.onMove}/> : <div/>}
    <div className="core">
      <div className="header">
        <span>{props.label}</span>
        <NumericInput noNull={true} min={props.min} max={props.max} value={props.value} onChange={handleValueChange}/>
        <GiAnticlockwiseRotation size={15}  className={`button reset`} onClick={e => handleValueChange(props.default)}/>
      </div>
      <Slider step={props.sliderStep ?? 0.01} min={props.sliderMin} max={props.sliderMax} value={props.value} default={props.default} onChange={handleValueChange}/>
    </div>
  </div>
}


