import { useState, DetailedHTMLProps, HTMLAttributes, useEffect } from "react"
import { ModalBase } from "./ModalBase"
import "./Tooltip.css"

type ToolTipProps = {
  label?: string
  labelAlt?: React.ReactElement
  tooltip: string
  pass?: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>,
  alert?: boolean
  noHover?: boolean
}

export const Tooltip = (props: ToolTipProps) => {
  const [ref, setRef] = useState(null as {x: number, y: number, w: number, hover?: boolean}) 
  const hover = !props.noHover && !props.alert

  useEffect(() => {
    const handle = (e: PointerEvent | WheelEvent) => {
      setRef(null)
      e.stopImmediatePropagation()
      e.preventDefault()
    }

    if (ref?.hover) {
      window.addEventListener("pointerdown", handle, true)
      window.addEventListener("wheel", handle, true)
    }

    return () => {
      window.removeEventListener("pointerdown", handle, true)
      window.removeEventListener("wheel", handle, true)
    }

  }, [ref])

  const updateRef = (x: number, y: number, hover?: boolean) => {
    if (props.alert) {
      return alert(props.tooltip)
    }
    let w = Math.min(300, window.innerWidth - 20) 
    
    const maxX = window.innerWidth - w - 10
    const maxY = window.innerHeight - 100
    setRef({
      x: Math.max(10, Math.min(maxX, x + 20)),
      y: Math.max(10, Math.min(maxY, y + 15)),
      w,
      hover
    })
  }

  const handleClick = (e: React.MouseEvent) => {
    if (ref) return 
    e.stopPropagation()
    updateRef(e.clientX, e.clientY)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter") return 

    if (ref) {
      setRef(null)
    }  else {
      const { x, y } = (e.target as HTMLDivElement).getBoundingClientRect()
      updateRef(x, y)
    }
  }

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (ref) return 
    updateRef(e.clientX, e.clientY, true)
  }
  

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (ref?.hover) {
      setRef(null)
    }
  }


  return <div onPointerEnter={hover ? handlePointerEnter : null} onPointerLeave={handlePointerLeave} tabIndex={0} {...(props.pass || {})} className="Tooltip" onClick={handleClick} onKeyDown={handleKeyDown}>
    {!props.labelAlt && <span>{props.label ?? "?"}</span>}
    {props.labelAlt}

    {ref && (
      <ModalBase passThrough={ref.hover} color={"#00000000"} onClose={() => setRef(null)}>
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