import { useState } from "react"
import { ThrottledTextInput } from "./ThrottledTextInput"
import { ModalBase } from "./ModalBase"
import "./ModalText.css"
import { Gear } from "./svgs"

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
      <button className="icon gear interactive" onClick={e => setModal(!modal)}>
          <Gear size="1.57rem"/>
      </button>
    )}
  </div>
}