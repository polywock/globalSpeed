import React, { useMemo } from "react"
import { clamp, round } from "../utils/helper"
import { NumericInput } from "../comps/NumericInput"
import { GiAnticlockwiseRotation } from "react-icons/gi"
import debounce from "lodash.debounce"
import "./SliderMicro.scss"

type SliderMicroProps = {
  label: React.ReactNode,
  value: number,
  sliderMin: number,
  sliderMax: number,
  sliderStep?: number,
  min?: number,
  max?: number,
  default: number,
  onChange?: (newValue: number) => void,
  withInput?: boolean,
  pass?: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>
}


export function SliderMicro(props: SliderMicroProps) {

  const env = useMemo(() => ({props} as {props: SliderMicroProps}), [])
  env.props = props 
  
  const handleValueChangeDeb = debounce((value: number, relative?: boolean) => {
    const { props } = env 
    props.onChange(clamp(props.min, props.max, relative ? props.value + value : value))
  }, 25, {maxWait: 50, leading: true, trailing: true})

  const handleValueChange = (value: number, relative?: boolean) => {
    props.onChange(clamp(props.min, props.max, relative ? props.value + value : value))
  }

  return <div {...(props.pass ?? {})} className={`SliderMicro ${props.withInput ? "withInput" : ""} ${props.default !== props.value ? "highlight" : ""}`}>
    <span title={round(props.value, 2).toString()}>{props.label}</span>
    <input list={`${props.label}_ticks`} type="range" min={props.sliderMin} max={props.sliderMax} step={props.sliderStep ?? 0.01} value={props.value} onChange={e => {
      handleValueChangeDeb(e.target.valueAsNumber)
    }}/>
    <datalist id={`${props.label}_ticks`} >
      <option value={props.default}></option>
    </datalist>
    {props.withInput && (
      <NumericInput value={props.value} min={props.min} max={props.max} noNull={true} onChange={v => {
        handleValueChange(v)
      }}/>
    )}
    <GiAnticlockwiseRotation size={15}  className={`button reset`} onClick={e => handleValueChange(props.default)}/>
  </div>
}