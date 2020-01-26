import React, { useState } from "react"
import "./KeyPicker.scss"

type KeyPickerProps = {
  onChange: (key: string) => void
  value: string
}

export const KeyPicker = (props: KeyPickerProps) => {
  const [enterState, setEnterState] = useState(false)
  const [viaEnterKeyFlag, setviaEnterKeyFlag] = useState(false) 

  const handleOnKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !viaEnterKeyFlag) {
      setEnterState(!enterState)
      setviaEnterKeyFlag(true)
      return 
    }

    if (enterState === true) {
      if (e.nativeEvent.code) {
        props.onChange && props.onChange(e.nativeEvent.code)
        setEnterState(false)
      }
    }
  }

  const handleOnKeyUp= (e: React.KeyboardEvent) => {
    e.key === "Enter" && viaEnterKeyFlag === true && setviaEnterKeyFlag(false)
  }

  return (
    <div 
      onBlur={() => setEnterState(false)} 
      onKeyDown={handleOnKeyDown} 
      onKeyUp={handleOnKeyUp}
      onClick={e => setEnterState(!enterState)} 
      tabIndex={0} 
      className="KeyPicker">
      {enterState ? "..." : props.value}
    </div>
  )
}