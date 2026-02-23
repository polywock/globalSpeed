import { useMemo, useState, useEffect, useCallback, DetailedHTMLProps, InputHTMLAttributes, TextareaHTMLAttributes  } from "react"
import debounce from "lodash.debounce"
import { assertType } from "@/utils/helper"

type ThrottledTextInputProps = {
  value: string,
  onChange: (newValue: string) => void,
  passInput?: React.ComponentProps<'input'>,
  passTextArea?: React.ComponentProps<'textarea'>,
  textArea?: boolean,
  placeholder?: string
}

type Env = {
  intervalId?: number, 
  sendUpdateDebounced?: ((value: string) => void) & {flush: () => void},
  handleBlur?: () => void
  props?: ThrottledTextInputProps
}

export function ThrottledTextInput(props: ThrottledTextInputProps) {
  const [ghostValue, setGhostValue] = useState(props.value)
  const env = useMemo<Env>(() => ({}), [])
  env.props = props 

  useEffect(() => {
    setGhostValue(props.value)
  }, [props.value])


  env.sendUpdateDebounced = useCallback(debounce((value: string) => {
    env.props.onChange(value)
  }, 500, {
    maxWait: 3000,
    leading: true,
    trailing: true
  }), [])

  env.handleBlur = () => {
    env.sendUpdateDebounced.flush()
  }

  useEffect(() => {
    window.addEventListener("beforeunload", e => {
      env.handleBlur()
    })
    return () => {
      env.handleBlur()
    }
  }, [])

  if (props.textArea) {
    return (
      <textarea placeholder={props.placeholder} onKeyDown={e => {
        if (e.key === "Tab") {
          e.preventDefault();
          const item = e.target
          assertType<HTMLTextAreaElement>(item)
          var start = item.selectionStart;
          var end = item.selectionEnd;

          // Add spaces 
          const newText = item.value.substring(0, start) + "  " + item.value.substring(end);

          // Adjust cursor. 
          item.selectionStart = item.selectionEnd = start + 2;
          setGhostValue(newText)
          env.sendUpdateDebounced(newText)
        }
      }} {...(props.passTextArea ?? {})} value={ghostValue || ""} onChange={e => {
        setGhostValue(e.target.value)
        env.sendUpdateDebounced(e.target.value)
      }} onBlur={env.handleBlur}/>
    )
  } 

  return (
    <input placeholder={props.placeholder}  {...(props.passInput ?? {})} value={ghostValue || ""} onChange={e => {
      setGhostValue(e.target.value)
      env.sendUpdateDebounced(e.target.value)
    }} type="text"onBlur={env.handleBlur}/>
  )
}