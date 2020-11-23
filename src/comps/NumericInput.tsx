import { useState, useEffect, ChangeEvent } from "react"
import { FloatTooltip } from "./FloatTooltip"
import { round } from "../utils/helper"

const NUMERIC_REGEX = /^-?(?=[\d\.])\d*(\.\d+)?$/

type NumericInputProps = {
  value: number,
  onChange: (newValue: number) => any,
  placeholder?: string,
  noNull?: boolean
  min?: number,
  max?: number,
  rounding?: number,
  disabled?: boolean
}


export const NumericInput = (props: NumericInputProps) => {
  const [ghostValue, setGhostValue] = useState("")
  const [problem, setProblem] = useState(null as string)

  useEffect(() => {
    setProblem(null)
    if (props.value == null) {
      ghostValue !== "" && setGhostValue("")
    } else {
      let parsedGhostValue = parseFloat(ghostValue)
      if (parsedGhostValue !== props.value) {
        setGhostValue(round(props.value, props.rounding ?? 4).toString())
      }
    }
  }, [props.value])
  
  
  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    setGhostValue(e.target.value)
    const value = e.target.value.trim()
    if (!value) {
      if (props.noNull) {
        setProblem("empty")
      } else {
        setProblem(null)
        props.onChange(null)
      }
      return 
    }
    
    const parsed = round(parseFloat(value), props.rounding ?? 4)
    if (NUMERIC_REGEX.test(value) && !isNaN(parsed)) {
      if (props.min != null && parsed < props.min) {
        setProblem(`>= ${props.min}`)
        return 
      }
      if (props.max != null && parsed > props.max) {
        setProblem(`<=  ${props.max}`)
        return
      }
      if (parsed !== round(props.value, props.rounding ?? 4)) {
        props.onChange(parsed)
      }
      setProblem(null)
    } else {
      setProblem(`NaN`) 
    }
  }

  return (
    <div className={`NumericInput`} style={{position: "relative"}}>
      <input 
        disabled={props.disabled ?? false}
        onBlur={e => {
          setProblem(null)
          setGhostValue(props.value == null ? "" : round(props.value, props.rounding ?? 4).toString())
        }}
        className={problem ? "error" : ""}
        placeholder={props.placeholder}
        type="text" 
        onChange={handleOnChange} value={ghostValue}
      />
      {problem && (
        <FloatTooltip value={problem}/>
      )}
    </div>
  )
}




