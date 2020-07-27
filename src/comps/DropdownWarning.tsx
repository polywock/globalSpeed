import React, { useState } from "react"
import { MdWarning } from "react-icons/md"
import { GoChevronDown, GoChevronUp } from "react-icons/go"
import "./DropdownWarning.scss"

type DropdownWarningProps = {
  value: React.ReactNode,
  label?: string,
  defaultExpanded?: boolean
}

export function DropdownWarning (props: DropdownWarningProps) {
  let [expanded, setExpanded] = useState(props.defaultExpanded)

  return <div className="DropdownWarning">
    <div className="header" onClick={e => {
      setExpanded(!expanded)
    }}>
      <MdWarning size={15}/>
      <span>{props.label ?? window.gsm.token.warning}</span>
      {expanded ? (
        <GoChevronUp size={15}/>
      ) : (
        <GoChevronDown size={15}/>
      )}
    </div>
    {expanded && (
      <div className="body">{props.value}</div>
    )}
  </div>
}