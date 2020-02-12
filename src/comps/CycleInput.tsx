import React, { useState, useEffect } from "react"
import { round, compareArrays, stringDropWhileEnd } from "../utils/helper"

const NUMERIC_REGEX = /^-?(?=[\d\.])\d*(\.\d+)?$/

type CycleInputProps = {
  values: number[],
  onChange: (newValues: number[]) => any,
  placeholder?: string,
  noNull?: boolean
  displayRound?: number,
  min?: number,
  max?: number
}


export const CycleInput = (props: CycleInputProps) => {
  const [ghostValue, setGhostValue] = useState("")
  const [isValid, setIsValid] = useState(true)

  useEffect(() => {
    if (props.values == null) {
      setGhostValue("")
    } else {
      setGhostValue(
        props.values.map(v => round(v, props.displayRound ?? 2)).join(", ")
      )
    }
  }, [...(props.values ?? [])])
  
  
  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGhostValue(e.target.value)
    const values = stringDropWhileEnd(e.target.value.replace(/\s/g, ""), v => v === ",")
    if (!values) {
      if (props.noNull) {
        setIsValid(false)
      } else {
        setIsValid(true)
        props.onChange(null)
      }
      return 
    }

    let newValues: number[] = []
    for (let value of values.split(",")) {
      if (!NUMERIC_REGEX.test(value)) {
        return setIsValid(false)
      }

      const parsed = parseFloat(value)
      if (props.min != null && parsed < props.min) {
        return setIsValid(false) 
      }
      if (props.max != null && parsed > props.max) {
        return setIsValid(false)
      }
      newValues.push(parsed)
    }

    
    if (!compareArrays(newValues, props.values)) {
      props.onChange(newValues)
    }
    
    return setIsValid(true)
  }

  return (
    <input 
      placeholder={props.placeholder}
      type="text" 
      className={`${isValid ? "" : "red"}`} 
      onChange={handleOnChange} value={ghostValue}/>
  )
}