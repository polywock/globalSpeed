import { useState } from "react"
import { ThrottledTextInput } from "./ThrottledTextInput"
import { ModalBase } from "./ModalBase"
import { GearIcon } from "./GearIcon"
import "./ModalText.css"

type ModalTextProps = {
  value: string,
  onChange: (newValue: string) => void,
  label?: string 
}

export function ModalText(props: ModalTextProps) {
  const [modal, setModal] = useState(false)

  return <div className="ModalText">
    <GearIcon tooltip={gvar.gsm.token.edit} onClick={e => setModal(!modal)}/>
    {modal && <ModalBase passClass="ModalText" keepOnWheel={true} onClose={() => {
        setModal(false)
      }}>
        <ThrottledTextInput textArea={true} value={props.value} onChange={v => {
          props.onChange(v)
        }}/>
      </ModalBase> 
    }
  </div>
}