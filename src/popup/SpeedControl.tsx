
import React from "react"
import { SPEED_PRESETS } from "../defaults"
import { NumericInput } from "../comps/NumericInput"
import "./SpeedControl.scss"
import { NumericControl } from "../comps/NumericControl"

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
          tabIndex={0}
          className={props.speed === v ? "selected" : ""}
          onClick={() => props.onChange(v)}
        >{v.toFixed(2)}</div> 
      ))}
    </div>
    <NumericControl 
      value={props.speed} 
      onChange={newValue => props.onChange(newValue)}
      smallStep={0.01}
      largeStep={0.05}
      min={0.07}
      max={16}
      inputNoEmpty={true}
    />
  </div>
}