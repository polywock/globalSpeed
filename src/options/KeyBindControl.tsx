import React from "react"
import { KeyBind, FilterTarget, SetState } from "../types"
import produce from "immer"
import { KeyPicker } from "../comps/KeyPicker"
import "./KeyBindControl.scss"
import { Tooltip } from "../comps/Tooltip"
import { NumericInput } from "../comps/NumericInput"
import { commandInfos } from "../defaults/commands"
import { filterInfos, FilterName, filterTargets  } from "../defaults/filters"
import { GoArrowUp, GoArrowDown, GoChevronDown, GoChevronUp, GoX, GoTriangleDown, GoCode, GoLink, GoLocation, GoMute, GoPin, GoZap } from "react-icons/go"
import { CycleInput } from "../comps/CycleInput"
import { ModalText } from "../comps/ModalText"
import { FaPowerOff, FaPause, FaAngleDoubleRight, FaAngleDoubleLeft, FaStepBackward, FaStepForward, FaEquals, FaFilter, FaBookmark, FaLink, FaInfinity } from "react-icons/fa"


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

  


  return <div className={`KeyBindControl ${value.spacing === 1 ? "spacing" : value.spacing === 2 ? "doubleSpacing" : ""} ${value.enabled ? "" : "disabled"}`}>
    <div className="move">
      <button className="icon" onClick={() => props.onMove(value.id, false)}>
        <GoArrowUp size="20px"/>
      </button> 
      <button className="icon" onClick={() => props.onMove(value.id, true)}>
        <GoArrowDown size="20px"/>
      </button>
    </div>
    <input type="checkbox" checked={value.enabled} onChange={e => {
      props.onChange(value.id, produce(value, d => {
        d.enabled = !value.enabled
      }))
    }}/>
    <div className="command">
      <div className="name">
        <span>{`${window.gsm[commandInfo.name] || ""}`}</span>
        {value.command === "adjustSpeed" && <>
          {value.valueNumber < 0 && (
            <FaAngleDoubleLeft size="15px"/>
          )}
          {value.valueNumber > 0 && (
            <FaAngleDoubleRight size="15px"/>
          )}
        </>}
        {value.command === "runCode" && <GoCode size="14px"/>}
        {value.command === "openUrl" && <FaLink size="14px"/>}
        {value.command === "setSpeed" && <FaEquals size="14px"/>}
        {value.command === "setPin" && <GoPin size="15px"/>}
        {["setFx", "resetFx", "flipFx", "setFilter", "adjustFilter", "cycleFilterValue"].includes(value.command)&& <GoZap size="18px"/>}
        {value.command === "setPause" && <FaPause size="13px"/>}
        {value.command === "setMute" && <GoMute size="15px"/>}
        {value.command === "setState" && <FaPowerOff size="14px"/>}
        {["setMark", "seekMark"].includes(value.command) && <FaBookmark size="13px"/>}
        {value.command === "toggleLoop" && <FaInfinity size="14px"/>}
        {value.command === "seek" && <>
          {value.valueNumber < 0 && (
            <FaStepBackward size="14px"/>
          )}
          {value.valueNumber > 0 && (
            <FaStepForward size="14px"/>
          )}
        </>}
        {commandInfo.tooltip && (
          <Tooltip label="?" tooltip={window.gsm[commandInfo.tooltip]}/>
        )}
      </div>
      {(commandInfo.withFilterTarget || commandInfo.withFilterOption) && (
        <div className="support">
          {commandInfo.withFilterTarget && (
            <select 
              value={value.filterTarget} 
              onChange={e => {
                props.onChange(value.id, produce(value, d => {
                  d.filterTarget = e.target.value as FilterTarget
                }))
              }}
            >{filterTargets.map(v => {
              return <option key={v} value={v}>{window.gsm[`token_${v}`] || ""}</option>
            })}</select>
          )}
          {commandInfo.withFilterOption && (
            <select 
              value={value.filterOption} 
              onChange={e => {
                props.onChange(value.id, produce(value, d => {
                  d.filterOption = e.target.value as FilterName
                }))
              }}
            >{Object.entries(filterInfos).map(([k, v]) => {
              return <option key={k} value={k}>{window.gsm[v.name] || ""}</option>
            })}</select>
          )}
        </div>
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
    {commandInfo.valueType === "modalString" && (
      <ModalText label="edit code" value={value.valueString} onChange={v => {
        props.onChange(value.id, produce(value, d => {
          d.valueString = v
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
        return <option key={v} value={v}>{window.gsm[`token_${v}`] || ""}</option>
      })}</select>
    )}
    {!commandInfo.valueType && <div/>}
    <button className="icon" onClick={e => {
       props.onChange(value.id, produce(value, d => {
        d.spacing = ((value.spacing || 0) + 1) % 3
      }))
    }}>
      {!value.spacing && (
        <GoChevronDown size="20px"/>
      )} 
      {value.spacing === 1 && (
        <GoTriangleDown size="20px"/>
      )} 
      {value.spacing === 2 && (
        <GoChevronUp size="20px"/>
      )} 
    </button>
    <button className="close icon" onClick={e => props.onRemove(value.id)}>
      <GoX size="23px"/>
    </button>
  </div>
}