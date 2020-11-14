import { useMemo, useState, useEffect, useCallback, DetailedHTMLProps, InputHTMLAttributes, TextareaHTMLAttributes  } from "react"
import debounce from "lodash.debounce"

type ThrottledTextInputProps = {
  value: string,
  onChange: (newValue: string) => void,
  passInput?: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
  passTextArea?: DetailedHTMLProps<TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>,
  textArea?: boolean
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
      <textarea {...(props.passTextArea ?? {})} value={ghostValue} onChange={e => {
        setGhostValue(e.target.value)
        env.sendUpdateDebounced(e.target.value)
      }} onBlur={env.handleBlur}/>
    )
  } 

  return (
    <input {...(props.passInput ?? {})} value={ghostValue} onChange={e => {
      setGhostValue(e.target.value)
      env.sendUpdateDebounced(e.target.value)
    }} type="text"onBlur={env.handleBlur}/>
  )
}