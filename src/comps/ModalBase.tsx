
import { ReactElement, useRef } from "react"
import "./ModalBase.scss"

type Props = {
  children: ReactElement,
  onClose: () => void 
}

export function ModalBase(props: Props) {
  const ref = useRef<HTMLDivElement>()

  return <div ref={ref} onMouseDown={e => {
    if (e.target === ref.current) {
      props.onClose()
    }
  }} className="ModalBase">
    {props.children}
  </div>
}
