import { produce } from "immer"
import { ModalBase } from "../comps/ModalBase"
import { URLCondition, URLConditionPart } from "../types"
import { ThrottledTextInput } from "../comps/ThrottledTextInput"
import { GoX } from "react-icons/go"
import { getDefaultURLConditionPart } from "../defaults"
import { findRemoveFromArray } from "../utils/helper"
import { extractURLPartValueKey } from "src/utils/configUtils"
import "./URLModal.css"

type Props = {
  onClose: () => void,
  onChange: (value: URLCondition) => void,
  onReset: () => void, 
  value: URLCondition,
  noRegex?: boolean
}

export function URLModal(props: Props) {
  const { value } = props  

  const onChange = (part: URLConditionPart) => {
    props.onChange(produce(value, d => {
      const idx = d.parts.findIndex(p => p.id === part.id)
      if (idx >= 0) {
        d.parts[idx] = part 
      }
    }))
  }

  const onRemove = (part: URLConditionPart) => {
    props.onChange(produce(value, d => {
      findRemoveFromArray(d.parts, p => p.id === part.id)
    }))
  }

  const hasLength = props.value?.parts?.length

  return <ModalBase keepOnWheel={true} onClose={props.onClose}>
    <div className="URLModal ModalMain">

      {/* Header */}
      <div className="header">

        {/* Label */}
        <div>{gvar.gsm.options.rules.conditions}</div>

        {/* Match mode */}
        {hasLength ? (
          <select value={value.block ? "BLOCK" : "ALLOW"} onChange={e => {
              props.onChange(produce(value, d => {
                d.block = e.target.value === "BLOCK"
              }))
            }}>
            <option value="ALLOW">{gvar.gsm.options.rules.allowlist}</option>
            <option value="BLOCK">{gvar.gsm.options.rules.blocklist}</option>
          </select> 
        ) : <div></div>}

      </div>

      {/* Parts  */}
      <div className="parts">
        {value.parts.map(part => (
          <ULRConditionPart noRegex={props.noRegex} key={part.id} onChange={onChange} onRemove={onRemove} part={part}/>
        ))}
      </div>

      {/* Controls */}
      <div className="controls">

        {/* Create */}
        <button onClick={e => {
          props.onChange(produce(value, d => {
            d.parts.push(getDefaultURLConditionPart())
          }))
        }}>{gvar.gsm.token.create}</button>

        {/* Reset */}
        {hasLength ? <button onClick={props.onReset}>{gvar.gsm.token.reset}</button> : <div></div>}
      </div>
    </div>
  </ModalBase>
}

function ULRConditionPart(props: {
  part: URLConditionPart,
  onChange: (part: URLConditionPart) => void,
  onRemove: (part: URLConditionPart) => void,
  noRegex?: boolean
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
        {(!props.noRegex || part.type === "REGEX") && <option value={"REGEX"}>{gvar.gsm.options.rules.regex}</option>}
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