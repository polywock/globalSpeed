import React, { useMemo } from "react"
import { clamp } from "../utils/helper"
import { NumericInput } from "../comps/NumericInput"
import { GiAnticlockwiseRotation } from "react-icons/gi"
import debounce from "lodash.debounce"
import { Move } from "./Move"
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

  const tickId = useMemo(() => Math.ceil(Math.random() * 1E6).toString(), [])

  const env = useMemo(() => ({props} as {props: SliderPlusProps}), [])
  env.props = props 
  
  const handleValueChangeDeb = debounce((value: number, relative?: boolean) => {
    const { props } = env 
    props.onChange(clamp(props.min, props.max, relative ? props.value + value : value))
  }, 25, {maxWait: 50, leading: true, trailing: true})

  const handleValueChange = (value: number, relative?: boolean) => {
    props.onChange(clamp(props.min, props.max, relative ? props.value + value : value))
  }


  return <div className={`SliderPlus ${props.default !== props.value ? "highlight" : ""}`}>
    {props.onMove ? <Move onMove={props.onMove}/> : <div/>}
    <div className="core">
      <div className="header">
        <span>{props.label}</span>
        <NumericInput noNull={true} min={props.min} max={props.max} value={props.value} onChange={v => handleValueChange(v, false)}/>
        <GiAnticlockwiseRotation size={15}  className={`button reset`} onClick={e => handleValueChange(props.default)}/>
      </div>
      <input list={tickId} type="range" min={props.sliderMin} max={props.sliderMax} step={props.sliderStep ?? 0.01} value={props.value} onChange={e => {
        handleValueChangeDeb(e.target.valueAsNumber)
      }}/>
      <datalist id={tickId} >
        <option value={props.default}></option>
      </datalist>
    </div>
  </div>
}