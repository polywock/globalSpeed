
import { useEffect } from "react"
import { ReactElement, useRef } from "react"
import "./ModalBase.scss"

type Props = {
  children: ReactElement,
  onClose: () => void,
  color?: string,
  keepOnClose?: boolean
}

export function ModalBase(props: Props) {
  const ref = useRef<HTMLDivElement>()

  useEffect(() => {
    if (props.keepOnClose) {
      return 
    }

    const handleScroll = (e: Event) => {
      props.onClose()
    }

    document.addEventListener("scroll", handleScroll, {passive: true, capture: true})
    return () => {
      document.removeEventListener("scroll", handleScroll, true)
    }
  }, [props.keepOnClose])

  return <div {...(props.color ? {style: {backgroundColor: props.color}} : {})} ref={ref} onMouseDown={e => {
    if (e.target === ref.current) {
      props.onClose()
    }
  }} className="ModalBase">
    {props.children}
  </div>
}
