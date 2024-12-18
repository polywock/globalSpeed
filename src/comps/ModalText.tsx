import { useState } from "react"
import { ThrottledTextInput } from "./ThrottledTextInput"
import { ModalBase } from "./ModalBase"
import "./ModalText.css"
import { Gear } from "./svgs"
import { Tooltip } from "./Tooltip"
import { GearIcon } from "./GearIcon"

type ModalTextProps = {
  value: string,
  onChange: (newValue: string) => void,
  label?: string 
}

export function ModalText(props: ModalTextProps) {
  const [modal, setModal] = useState(false)

  return <div className="ModalText">
    {modal ? (
      <ModalBase keepOnWheel={true} onClose={() => {
        setModal(false)
      }}>
        <ThrottledTextInput textArea={true} value={props.value} onChange={v => {
          props.onChange(v)
        }}/>
      </ModalBase>
    ) : (
      <GearIcon tooltip={gvar.gsm.token.edit} onClick={e => setModal(!modal)}/>
    )}
  </div>
}