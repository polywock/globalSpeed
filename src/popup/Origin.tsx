import React from "react"
import "./Origin.scss"

type OriginProps = {
  x: string,
  y: string,
  onChange: (x: string, y: string) => void 
}

export function Origin (props: OriginProps){
  return (
    <div className="Origin">
      {Y_OPTIONS.map(y => X_OPTIONS.map(x => [x, y])).flat(1).map(([x, y]) => (
        <div className={(x === props.x && y === props.y) ? "active" : ""} key={`${x}:${y}`} tabIndex={0} onClick={e => props.onChange(x, y)}></div>
      ))}
    </div>
  )
}

const X_OPTIONS = ["left", "center", "right"]
const Y_OPTIONS = ["top", "center", "bottom"]