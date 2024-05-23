import { useState, ReactNode } from "react"
import { MdWarning } from "react-icons/md"
import { GoChevronDown, GoChevronUp } from "react-icons/go"
import "./DropdownWarning.css"

type DropdownWarningProps = {
  value: ReactNode,
  label?: string,
  defaultExpanded?: boolean
}

export function DropdownWarning (props: DropdownWarningProps) {
  let [expanded, setExpanded] = useState(props.defaultExpanded)

  return <div className="DropdownWarning">
    <div className="header" onClick={e => {
      setExpanded(!expanded)
    }}>
      <MdWarning size={"1.15rem"}/>
      <span>{props.label ?? gvar.gsm.token.warning}</span>
      {expanded ? (
        <GoChevronUp size={"1.07rem"}/>
      ) : (
        <GoChevronDown size={"1.07rem"}/>
      )}
    </div>
    {expanded && (
      <div className="body">{props.value}</div>
    )}
  </div>
}