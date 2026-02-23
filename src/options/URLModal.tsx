import { produce } from "immer"
import { ModalBase } from "../comps/ModalBase"
import { URLCondition, URLConditionPart } from "../types"
import { ThrottledTextInput } from "../comps/ThrottledTextInput"
import { GoX } from "react-icons/go"
import { getDefaultURLConditionPart } from "../defaults"
import { findRemoveFromArray } from "../utils/helper"
import { extractURLPartValueKey, getSelectedParts } from "@/utils/configUtils"
import "./URLModal.css"

type Props = {
  onClose: () => void,
  onChange: (value: URLCondition) => void,
  onReset: () => void,
  value: URLCondition,
}

export function URLModal(props: Props) {
  const { value } = props
  const listKey = value.block ? "blockParts" : "allowParts"
  const parts = getSelectedParts(value)

  const onChange = (part: URLConditionPart) => {
    props.onChange(produce(value, d => {
      const idx = d[listKey].findIndex(p => p.id === part.id)
      if (idx >= 0) {
        d[listKey][idx] = part
      }
    }))
  }

  const onRemove = (part: URLConditionPart) => {
    props.onChange(produce(value, d => {
      findRemoveFromArray(d[listKey], p => p.id === part.id)
    }))
  }

  return <ModalBase keepOnWheel={true} onClose={props.onClose}>
    <div className="URLModal ModalMain">

      {/* Header */}
      <div className="header">

        {/* Label */}
        <div>{gvar.gsm.options.rules.conditions}</div>

        {/* Match mode */}
        <select value={value.block ? "BLOCK" : "ALLOW"} onChange={e => {
            props.onChange(produce(value, d => {
              d.block = e.target.value === "BLOCK"
            }))
          }}>
          <option value="ALLOW">{gvar.gsm.options.rules.allowlist}</option>
          <option value="BLOCK">{gvar.gsm.options.rules.blocklist}</option>
        </select>

      </div>

      {/* Parts  */}
      <div className="parts">
        {parts.map(part => (
          <ULRConditionPart key={part.id} onChange={onChange} onRemove={onRemove} part={part}/>
        ))}
      </div>

      {/* Controls */}
      <div className="controls">

        {/* Create */}
        <button onClick={e => {
          props.onChange(produce(value, d => {
            d[listKey].push(getDefaultURLConditionPart())
          }))
        }}>{gvar.gsm.token.create}</button>

        {/* Reset */}
        {parts.length ? <button onClick={props.onReset}>{gvar.gsm.token.reset}</button> : <div></div>}
      </div>
    </div>
  </ModalBase>
}

function ULRConditionPart(props: {
  part: URLConditionPart,
  onChange: (part: URLConditionPart) => void,
  onRemove: (part: URLConditionPart) => void
}) {
  const { part, onChange, onRemove } = props
  const valueKey = extractURLPartValueKey(part)

  return (
    <div key={part.id}>

      {/* Status */}
      <input type="checkbox" checked={!part.disabled} onChange={() => {
        onChange(produce(part, d => {
          d.disabled = !d.disabled
        }))
      }}/>

      {/* Match type */}
      <select value={part.type} onChange={e => {
        onChange(produce(part, d => {
          d.type = e.target.value as any
        }))
      }}>
        <option value={"STARTS_WITH"}>{gvar.gsm.options.rules.startsWith}</option>
        <option value={"CONTAINS"}>{gvar.gsm.options.rules.contains}</option>
        <option value={"REGEX"}>{gvar.gsm.options.rules.regex}</option>
     </select>

     {/* Terms */}
      <ThrottledTextInput value={part[valueKey]} onChange={newValue => {
        onChange(produce(part, d => {
          d[valueKey] = newValue
        }))
      }}/>

      {/* Delete */}
      <button className="close icon" onClick={() => {
        onRemove(part)
      }}>
        <GoX size="1.6rem"/>
      </button>
    </div>
  )
}