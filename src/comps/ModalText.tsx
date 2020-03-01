import React, { useState, useRef } from "react"
import "./ModalText.scss"

type ModalTextProps = {
  value: string,
  onChange: (newValue: string) => void,
  label?: string 
}

export function ModalText(props: ModalTextProps) {
  const [modal, setModal] = useState(false)
  const ref = useRef()

  return <div className="ModalText">
    {modal ? (
      <div ref={ref} className="fg" onMouseDown={e => {
        if (e.target === ref.current) {
          setModal(false)
        }
      }}>
        <textarea value={props.value} onChange={e => {
          props.onChange(e.target.value)
        }}/>
      </div>
    ) : (
      <button onClick={e => {
        setModal(!modal)
      }}>{props.label ?? "click to edit"}</button>
    )}
  </div>
}