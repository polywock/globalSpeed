import { useState, DetailedHTMLProps, HTMLAttributes } from "react"
import { ModalBase } from "./ModalBase"
import "./Tooltip.scss"

type ToolTipProps = {
  label?: string
  tooltip: string
  pass?: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>,
  alert?: boolean
}

export const Tooltip = (props: ToolTipProps) => {
  const [ref, setRef] = useState(null as {x: number, y: number, w: number}) 

  const updateRef = (x: number, y: number) => {
    if (props.alert) {
      return alert(props.tooltip)
    }
    let w = Math.min(300, window.innerWidth - 20) 
    
    const maxX = window.innerWidth - w - 10
    const maxY = window.innerHeight - 100
    setRef({
      x: Math.max(10, Math.min(maxX, x + 20)),
      y: Math.max(10, Math.min(maxY, y + 15)),
      w
    })
  }
  return <div {...(props.pass || {})} className="Tooltip">
    <span tabIndex={0} onKeyDown={e => {
      if (e.key === "Enter") {
        const { x, y } = (e.target as HTMLSpanElement).getBoundingClientRect()
        updateRef(x, y)
      }
    }} onClick={e => {
      updateRef(e.clientX, e.clientY)
    }}>{props.label ?? "?"}</span>
    {ref && (
      <ModalBase onClose={() => setRef(null)}>
        <div
          className="fg" 
          tabIndex={0} 
          onBlur={e => setRef(null)}
          style={{
            maxWidth: `${ref.w ?? 300}px`,
            left: `${ref.x}px`,
            top: `${ref.y}px`
          }}
        >{props.tooltip}</div>
      </ModalBase>
    )}
  </div>
}