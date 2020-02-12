import React, { useState } from "react"
import "./Tooltip.scss"


type ToolTipProps = {
  label?: string
  tooltip: string
  pass?: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>
}

export const Tooltip = (props: ToolTipProps) => {
  const [ref, setRef] = useState(null as {x: number, y: number}) 
  return <div {...(props.pass || {})} className="Tooltip">
    <span tabIndex={0} onClick={e => {
      setRef({
        x: e.clientX,
        y: e.clientY - 50
      })
    }}>{props.label ?? "?"}</span>
    {ref && (
      <>
        <div className="bg" onClick={e => setRef(null)}></div>
        <div 
          className="fg" 
          style={{
            left: `${ref.x}px`,
            top: `${ref.y}px`
          }}
        >{props.tooltip}</div>
      </>
    )}
  </div>
}