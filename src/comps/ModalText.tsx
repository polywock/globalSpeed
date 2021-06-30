import { useState } from "react"
import { ThrottledTextInput } from "./ThrottledTextInput"
import { ModalBase } from "./ModalBase"
import "./ModalText.scss"

type ModalTextProps = {
  value: string,
  onChange: (newValue: string) => void,
  label?: string 
}

export function ModalText(props: ModalTextProps) {
  const [modal, setModal] = useState(false)

  return <div className="ModalText">
    {modal ? (
      <ModalBase keepOnClose={true} onClose={() => {
        setModal(false)
      }}>
        <ThrottledTextInput textArea={true} value={props.value} onChange={v => {
          props.onChange(v)
        }}/>
      </ModalBase>
    ) : (
      <button onClick={e => {
        setModal(!modal)
      }}>{props.label ?? "edit"}</button>
    )}
  </div>
}