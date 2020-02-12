import React, { useMemo, useState, useEffect } from "react"

type ThrottledTextInputProps = {
  value: string,
  onChange: (newValue: string) => void,
  pollMs?: number,
  pass?: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
}

export function ThrottledTextInput(props: ThrottledTextInputProps) {
  const [ghostValue, setGhostValue] = useState(props.value)
  const state = useMemo(() => ({} as {intervalId?: number}), [])

  useEffect(() => {
    setGhostValue(props.value)
  }, [props.value])

  const handleUpdate = () => {
    props.onChange(ghostValue)
  }
  
  const handleFocus = () => {
    if (state.intervalId != null) {
      clearInterval(state.intervalId)
    }
    if (props.pollMs != null) {
      state.intervalId = setInterval(handleUpdate, props.pollMs)
    }
  }

  const handleBlur = () => {
    clearInterval(state.intervalId)
    handleUpdate()
  }

  return <input {...(props.pass ?? {})} value={ghostValue} onChange={e => {
    setGhostValue(e.target.value)
  }} type="text" onFocus={handleFocus} onBlur={handleBlur}/>
}