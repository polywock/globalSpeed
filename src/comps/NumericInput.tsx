import React, { useState, useEffect, useMemo } from "react"
import { round } from "../utils"

type NumericInputProps = {
  value: number,
  onChange: (newValue: number) => any,
  displayRound?: number,
  min?: number,
  max?: number
}

export const NumericInput = (props: NumericInputProps) => {
  const [inputValue, setInputValue] = useState("")

  useEffect(() => {
    setInputValue(round(props.value, props.displayRound ?? 2).toString())
  }, [props.value])
  
  const isValid = useMemo(() => {
    if (/^-?(?=[\d\.])\d*(\.\d+)?$/.test(inputValue.trim())) {
      const parsed = parseFloat(inputValue.trim())
      if (props.min != null && parsed < props.min) {
        return false 
      } 
      if (props.max != null && parsed > props.max) {
        return false 
      } 
      props.onChange(parsed)
      return true 
    } else {
      return false 
    }
  }, [inputValue])


  return (
    <input 
      type="text" 
      className={`NumericInput ${isValid ? "" : "invalid"}`} 
      onChange={e => {
        setInputValue(e.target.value)
      }} value={inputValue}/>
  )
}