import React from "react"
import { NumericInput } from "./NumericInput"
import "./CycleInput.scss"
import produce from "immer"

type CycleInputProps = {
  values: number[],
  onChange: (newValues: number[]) => void 
  min?: number,
  max?: number,
  defaultValue?: number 
}

export function CycleInput (props: CycleInputProps) {
  return <div className="CycleInput">
    <div className="values">
      {<>
        {props.values.map((value, i) => (
          <div key={i} className="value">
            <NumericInput 
              value={value} 
              onChange={v => {
                props.onChange(produce(props.values, d => {
                  d[i] = v
                }))
              }}
              min={props.min}
              max={props.max}
              noNull={true}
            />
            {props.values.length > 0 && (
              <div className="close" onClick={e => {
                props.onChange(produce(props.values, d => {
                  d.splice(i, 1)
                }))
              }}/>
            )}
          </div>
        ))}
        <div>
          <button onClick={e => {
            props.onChange(produce(props.values, d => {
              d.push(props.defaultValue ?? 0)
            }))
          }}>+</button>
        </div>
      </>}
    </div>
  </div>
}