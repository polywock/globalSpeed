import React, { useState, useEffect, useMemo } from "react"
import { round } from "../utils/helper"

const NUMERIC_REGEX = /^-?(?=[\d\.])\d*(\.\d+)?$/

type NumericInputProps = {
  value: number,
  onChange: (newValue: number) => any,
  placeholder?: string,
  noNull?: boolean
  displayRound?: number,
  min?: number,
  max?: number
}


export const NumericInput = (props: NumericInputProps) => {
  const [ghostValue, setGhostValue] = useState("")
  const [isValid, setIsValid] = useState(true)

  useEffect(() => {
    if (props.value == null) {
      setGhostValue("")
    } else {
      let parsedGhostValue = parseFloat(ghostValue)
      const newValue = round(props.value, props.displayRound ?? 4)
      if (parsedGhostValue !== newValue) {
        setGhostValue(newValue.toString())
      }
    }
  }, [props.value])
  
  
  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGhostValue(e.target.value)
    const value = e.target.value.trim()
    if (!value) {
      if (props.noNull) {
        setIsValid(false)
      } else {
        setIsValid(true)
        props.onChange(null)
      }
      return 
    }
    
    if (NUMERIC_REGEX.test(value)) {
      const parsed = parseFloat(value)
      if (props.min != null && parsed < props.min) {
        setIsValid(false)
        return 
      }
      if (props.max != null && parsed > props.max) {
        setIsValid(false)
        return
      }
      if (parsed !== props.value) {
        props.onChange(parsed)
      }
      setIsValid(true)
    } else {
      setIsValid(false) 
    }
  }

  return (
    <input 
      placeholder={props.placeholder}
      type="text" 
      className={`NumericInput ${isValid ? "" : "red"}`} 
      onChange={handleOnChange} value={ghostValue}/>
  )
}