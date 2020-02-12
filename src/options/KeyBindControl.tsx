import React from "react"
import { KeyBind, FilterTarget, SetState } from "../types"
import produce from "immer"
import { KeyPicker } from "../comps/KeyPicker"
import "./KeyBindControl.scss"
import { Tooltip } from "../comps/Tooltip"
import { NumericInput } from "../comps/NumericInput"
import { commandInfos } from "../defaults/commands"
import { filterInfos, FilterName, filterTargets  } from "../defaults/filters"
import { GoArrowUp, GoArrowDown, GoArrowBoth } from "react-icons/go"
import { CycleInput } from "../comps/CycleInput"

type KeyBindControlProps = {
  onChange: (id: string, newValue: KeyBind) => void,
  onRemove: (id: string) => void,
  onMove: (id: string, down: boolean) => void,
  value: KeyBind
}

export const KeyBindControl = (props: KeyBindControlProps) => {
  const { value } = props
  const commandInfo = commandInfos[value.command]

  const isAdjustFilter = value.command === "adjustFilter"
  let filterInfo = commandInfo.withFilterOption && filterInfos[value.filterOption]
  


  return <div className="KeyBindControl">
    <div className="move">
      <button onClick={() => props.onMove(value.id, false)}>
        <GoArrowUp size="20px"/>
      </button> 
      <button onClick={() => props.onMove(value.id, true)}>
        <GoArrowDown size="20px"/>
      </button>
    </div>
    <input type="checkbox" checked={value.enabled} onChange={e => {
      props.onChange(value.id, produce(value, d => {
        d.enabled = !value.enabled
      }))
    }}/>
    <div>
      <span>{commandInfo.shortName ?? commandInfo.name}</span>
      {commandInfo.withFilterTarget && (
        <select 
          value={value.filterTarget} 
          onChange={e => {
            props.onChange(value.id, produce(value, d => {
              d.filterTarget = e.target.value as FilterTarget
            }))
          }}
          style={{marginLeft: "10px"}}
        >{filterTargets.map(v => {
          return <option key={v} value={v}>{v}</option>
        })}</select>
      )}
      {commandInfo.withFilterOption && (
        <select 
          style={{marginLeft: "10px"}}
          value={value.filterOption} 
          onChange={e => {
            props.onChange(value.id, produce(value, d => {
              d.filterOption = e.target.value as FilterName
            }))
          }}
        >{Object.entries(filterInfos).map(([k, v]) => {
          return <option key={k} value={k}>{v.name}</option>
        })}</select>
      )}
      {commandInfo.tooltip && (
        <Tooltip label="?" tooltip={commandInfo.tooltip}/>
      )}
    </div>
    <KeyPicker value={value.key} onChange={newKey => {
      props.onChange(value.id, produce(value, d => {
        d.key = newKey
      }))
    }}/>
    <button className={value.ifMedia ? "blue" : ""} onClick={() => {
      props.onChange(value.id, produce(value, d => {
        d.ifMedia = !value.ifMedia
      }))
    }}>M</button>
    <button className={value.greedy ? "blue" : ""} onClick={() => {
      props.onChange(value.id, produce(value, d => {
        d.greedy = !value.greedy
      }))
    }}>G</button>
    {commandInfo.valueType === "number" && (
      <NumericInput min={commandInfo.valueMin} max={commandInfo.valueMax} value={value.valueNumber} onChange={v => {
        props.onChange(value.id, produce(value, d => {
          d.valueNumber = v
        }))
      }}/>
    )}
    {commandInfo.valueType === "filterNumber" && (
      <NumericInput min={isAdjustFilter ? null : filterInfo.min} max={isAdjustFilter ? null : filterInfo.max} placeholder={`default '${isAdjustFilter ? filterInfo.largeStep : filterInfo.default}'`} value={value.valueNumber} onChange={v => {
        props.onChange(value.id, produce(value, d => {
          d.valueNumber = v
        }))
      }}/>
    )}
    {commandInfo.valueType === "cycle" && (
      <CycleInput min={filterInfo.min} max={filterInfo.max}  placeholder={`default '0, 1'`} values={value.valueCycle} onChange={v => {
        props.onChange(value.id, produce(value, d => {
          d.valueCycle = v
        }))
      }}/>
    )}
    {commandInfo.valueType === "string" && (
      <input type="text" value={value.valueString} onChange={e => {
        props.onChange(value.id, produce(value, d => {
          d.valueString = e.target.value
        }))
      }}/>
    )}
    {commandInfo.valueType === "state" && (
      <select 
        value={value.valueState} 
        onChange={e => {
          props.onChange(value.id, produce(value, d => {
            d.valueState = e.target.value as SetState
          }))
        }}
      >{(["on", "off", "toggle"] as SetState[]).map(v => {
        return <option key={v} value={v}>{v}</option>
      })}</select>
    )}
    {!commandInfo.valueType && <div/>}
    <button className="close" onClick={e => props.onRemove(value.id)}>x</button>
  </div>
}