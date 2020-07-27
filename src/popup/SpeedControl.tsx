
import React from "react"
import "./SpeedControl.scss"
import { NumericControl } from "../comps/NumericControl"
import { conformSpeed } from "../utils/configUtils"

export const SPEED_PRESETS = [0.25, 0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 5, 10, 16]

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
      inputNoNull={true}
      rounding={2}
    />
  </div>
}