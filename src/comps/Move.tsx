import React from "react"
import { GoArrowUp, GoArrowDown } from "react-icons/go"
import "./Move.scss"

type MoveProps = {
  onMove: (down: boolean) => void
}

export function Move(props: MoveProps) {
  return <div className="Move">
    <button className="icon" onClick={() => props.onMove(false)}>
      <GoArrowUp size="20px"/>
    </button>
    <button className="icon" onClick={() => props.onMove(true)}>
      <GoArrowDown size="20px"/>
    </button>
  </div>
}