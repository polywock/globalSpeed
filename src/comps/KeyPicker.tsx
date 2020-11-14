import { useState, KeyboardEvent } from "react"
import { Hotkey, extractHotkey, formatHotkey } from "../utils/keys"
import "./KeyPicker.scss"



type KeyPickerProps = {
  onChange: (key: Hotkey) => void
  value: Hotkey
}

const MODIFIER_KEYS = ["Control", "Alt", "Shift", "Meta"]

export const KeyPicker = (props: KeyPickerProps) => {
  const [enterState, setEnterState] = useState(false)

  const handleOnKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      setEnterState(!enterState)
      return 
    }

    if (!enterState) {
      return 
    }


    // skip if modifier fear is target.
    if (MODIFIER_KEYS.includes(e.key)) {
      return 
    }

    e.preventDefault()

    props.onChange && props.onChange(extractHotkey(e.nativeEvent))
    setEnterState(false)
  }

  return (
    <div 
      onBlur={() => setEnterState(false)} 
      onKeyDown={handleOnKeyDown} 
      onClick={e => setEnterState(!enterState)} 
      tabIndex={0} 
      className="KeyPicker">
      {enterState ? "..." : formatHotkey(props.value)}
    </div>
  )
}