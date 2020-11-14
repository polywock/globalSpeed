import { useState, DetailedHTMLProps, HTMLAttributes } from "react"
import "./Tooltip.scss"

type ToolTipProps = {
  label?: string
  tooltip: string
  pass?: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>
}

export const Tooltip = (props: ToolTipProps) => {
  const [ref, setRef] = useState(null as {x: number, y: number, w: number}) 

  const updateRef = (x: number, y: number) => {
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
      <>
        <div className="bg" onClick={e => setRef(null)}></div>
        <div
          tabIndex={0} 
          onBlur={e => setRef(null)}
          className="fg" 
          style={{
            maxWidth: `${ref.w ?? 300}px`,
            left: `${ref.x}px`,
            top: `${ref.y}px`
          }}
        >{props.tooltip}</div>
      </>
    )}
  </div>
}