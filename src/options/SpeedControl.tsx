
import React from "react"
import { SPEED_PRESETS } from "../defaults"
import { NumericInput } from "../comps/NumericInput"
import "./SpeedControl.scss"

type SpeedControlProps = {
  onChange: (newSpeed: number) => any,
  speed: number 
}

export function SpeedControl(props: SpeedControlProps) {
  return <div className="SpeedControl">
    <div className="options">
      {SPEED_PRESETS.map(v => (
        <div 
          key={v}
          className={props.speed === v ? "selected" : ""}
          onClick={() => props.onChange(v)}
        >{v.toFixed(2)}</div> 
      ))}
    </div>
    <div className="controls">
      <button onClick={() => props.onChange(props.speed - 0.05)}>&lt;&lt;</button>
      <button onClick={() => props.onChange(props.speed - 0.01)}>&lt;</button>
      <NumericInput min={0.07} max={16} value={props.speed} onChange={v => {
        props.onChange(v)
      }}/>
      <button onClick={() => props.onChange(props.speed + 0.01)}>&gt;</button>
      <button onClick={() => props.onChange(props.speed + 0.05)}>&gt;&gt;</button>
    </div>
  </div>
}