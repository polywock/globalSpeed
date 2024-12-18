import { NumericInput } from "./NumericInput"
import { produce } from "immer"
import { FaPlus } from "react-icons/fa"
import "./CycleInput.css"

type CycleInputProps = {
  values: number[],
  onChange: (newValues: number[]) => void 
  min?: number,
  max?: number,
  defaultValue: number 
}

export function CycleInput (props: CycleInputProps) {
  return <div className="CycleInput">
    <div className="values">
      {<>
        {props.values.map((value, i) => (
          <div key={i} className="value">

            {/* Value */}
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

            {/* Delete circle */}
            {props.values.length > 0 && (
              <div className="close" onClick={e => {
                props.onChange(produce(props.values, d => {
                  d.splice(i, 1)
                }))
              }}/>
            )}
          </div>
        ))}

        {/* Add button */}
        <div>
          <button onClick={e => {
            props.onChange(produce(props.values, d => {
              d.push(props.defaultValue ?? 0)
            }))
          }}>
              <FaPlus/>
          </button>
        </div>
      </>}
    </div>
  </div>
}