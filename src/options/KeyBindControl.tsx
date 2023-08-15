import React, { useState } from "react"
import { Keybind, TargetFx, StateOption, AdjustMode } from "../types"
import produce from "immer"
import { KeyPicker } from "../comps/KeyPicker"
import { Tooltip } from "../comps/Tooltip"
import { NumericInput } from "../comps/NumericInput"
import { commandInfos } from "../defaults/commands"
import { filterInfos, FilterName, filterTargets  } from "../defaults/filters"
import { GoChevronDown, GoChevronUp, GoX, GoTriangleDown, GoCode, GoPin, GoZap, GoKebabVertical } from "react-icons/go"
import { CycleInput } from "../comps/CycleInput"
import { ModalText } from "../comps/ModalText"
import { FaPowerOff, FaPause, FaEquals, FaBookmark, FaLink, FaVolumeUp, FaVolumeMute, FaGlobe, FaPercent, FaFile, FaBackward, FaForward, FaArrowRight, FaExchangeAlt, FaPlus, FaMusic, FaList, FaStar } from "react-icons/fa"
import { TbArrowsHorizontal } from "react-icons/tb"
import { requestCreateTab } from "../utils/browserUtils"
import { GiAnticlockwiseRotation } from "react-icons/gi"
import { BsMusicNoteList } from "react-icons/bs"
import { TiArrowLoop } from "react-icons/ti"
import { MdFullscreen, MdPictureInPictureAlt, MdTimer } from "react-icons/md"
import { isFirefox, clamp, feedbackText, domRectGetOffset } from "../utils/helper"
import { ThrottledTextInput } from "../comps/ThrottledTextInput"
import { Move } from "../comps/Move"
import { Menu } from "../comps/Menu"
import { URLModal } from "./URLModal"
import { getDefaultURLCondition } from "../defaults"
import { pushView } from "../background/GlobalState"
import "./KeyBindControl.scss"


type KeybindControlProps = {
  onChange: (id: string, newValue: Keybind) => void,
  onRemove: (id: string) => void,
  onMove: (id: string, down: boolean) => void,
  value: Keybind,
  showNetSpeed: boolean,
  hideIndicator: boolean
}

export const KeybindControl = (props: KeybindControlProps) => {
  const { value } = props
  const [show, setShow] = useState(false)
  const [menu, setMenu] = useState(null as {x: number, y: number})

  const commandInfo = commandInfos[value.command]

  let label = (window.gsm.command as any)[value.command]
  let tooltip = (window.gsm.command as any)[value.command.concat("Tooltip")]

  let filterInfo = commandInfo.withFilterOption && filterInfos[value.filterOption]
  let setMin = filterInfo ? filterInfo.min : commandInfo.valueMin
  let setMax = filterInfo ? filterInfo.max : commandInfo.valueMax
  let setDefaultValue = filterInfo ? filterInfo.default : commandInfo.valueDefault

  let min = setMin 
  let max = setMax 
  let defaultValue = setDefaultValue 
  let noNull = commandInfo.noNull

  if (value.adjustMode === AdjustMode.ADD) {
    min = null; 
    max = null
    defaultValue = filterInfo ? filterInfo.step : commandInfo.valueStep
  }

  let numericInput: "valueNumber" | "valueNumberAlt";
  if (commandInfo.valueType === "number" || (commandInfo.valueType == "adjustMode" && value.adjustMode === AdjustMode.SET)) {
    numericInput = "valueNumber"
  } 
  if (commandInfo.valueType == "adjustMode" && value.adjustMode === AdjustMode.ADD) {
    numericInput = "valueNumberAlt"
  }
  if (value.command === "seek" && value.valueBool4) {
    numericInput = "valueNumberAlt"
    min = 0
    max = 100 
    defaultValue = 50
    noNull = false 
  }

  const specialKey = value.command === "setMark" && ["::nameless", "::nameless-prev", "::nameless-next"].includes(value.valueString?.toLowerCase())
  if (specialKey) {
    label = "special"
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement | HTMLButtonElement>) => {
    if (!(e.target === e.currentTarget)) return 
    e.preventDefault()
    setMenu({x: e.clientX, y: e.clientY})
  }

  return <div onContextMenu={handleContextMenu} className={`KeybindControl ${value.spacing === 1 ? "spacing" : value.spacing === 2 ? "doubleSpacing" : ""} ${value.enabled ? "" : "disabled"}`}>
    <div 
      className={`urlRules ${value.condition?.parts.length ? "active" : ""}`} 
      onClick={() => setShow(!show)}
      onContextMenu={e => {
        if (value.condition) {
          props.onChange(value.id, produce(value, d => {
            d.condition = getDefaultURLCondition()
          }))
          e.preventDefault()
        }
      }}
    >{value.condition?.parts.length || 0}</div>
    {!menu ? null : (
      <Menu items={[
        {name: "blockEvents", checked: !!value.greedy, label: <>{window.gsm.token.blockEvents}<Tooltip alert={true} pass={{style: {paddingLeft: "10px"}}} tooltip={window.gsm.options.editor.greedyMode}/></>},
        (commandInfo.hasFeedback && !props.hideIndicator) ? {name: "hideIndicator", label: window.gsm.token.hideIndicator, checked: !!value.hideIndicator} : null,
        (value.command === "seek") ? {name: "autoPause", label: window.gsm.command.setPause, checked: !!value.valueBool3} : null
      ].filter(v => v)} position={menu} onClose={() => setMenu(null)} onSelect={name => {
        if (name === "hideIndicator") {
          props.onChange(value.id, produce(value, d => {
            d.hideIndicator = !d.hideIndicator
          }))
        } else if (name === "blockEvents") {
          props.onChange(value.id, produce(value, d => {
            d.greedy = !d.greedy
          }))
        } else if (name === "autoPause") {
          props.onChange(value.id, produce(value, d => {
            d.valueBool3 = !d.valueBool3
          }))
        }
      }}/>
    )}
    {!show ? null : (
      <URLModal neutralValue={true} onReset={() => {
        props.onChange(value.id, produce(value, d => {
          d.condition = getDefaultURLCondition()
        }))
      }} onChange={newValue => {
        props.onChange(value.id, produce(value, d => {
          d.condition = newValue 
        }))
      }} onClose={() => {
        setShow(false)

        if (value.condition && value.condition.parts.length === 0) {
          props.onChange(value.id, produce(value, d => {
            delete d.condition 
          }))
        }
      }} value={value.condition || getDefaultURLCondition()}/>
    )}

    
    <Move onMove={down => {
      props.onMove(value.id, down)
    }}/>
    <input  type="checkbox" checked={value.enabled} onChange={e => {
      props.onChange(value.id, produce(value, d => {
        d.enabled = !value.enabled
      }))
    }}/>
    <div className="command">
      <div className="name" onContextMenu={handleContextMenu}>
        {value.command === "adjustSpeed" && <MdTimer size="1.3em"/>}
        {value.command === "speedChangesPitch" && <BsMusicNoteList size="1.3em"/>}
        {value.command === "runCode" && <GoCode size="1.1em"/>}
        {value.command === "openUrl" && <FaLink size="1em"/>}
        {value.command === "setPin" && <GoPin size="1.05em"/>}
        {value.command === "adjustFilter" && <GoZap size="1.3em"/>}
        {value.command === "setFx" && <div className="svg">
          <GoZap size="1.3em"/>
          <FaPowerOff size="1em"/>
        </div>}
        {value.command === "resetFx" && <div className="svg">
          <GoZap size="1.3em"/>
          <GiAnticlockwiseRotation size="1.1em"/>
        </div>}
        {value.command === "flipFx" && <div className="svg">
          <GoZap size="1.3em"/>
          <FaExchangeAlt size="1.05em"/>
        </div>}
        {value.command === "setPause" && <FaPause size="0.95em"/>}
        {value.command === "setMute" && <FaVolumeMute size="1.05em"/>}
        {value.command === "PiP" && <MdPictureInPictureAlt size="1.05em"/>}
        {value.command === "fullscreen" && <MdFullscreen size="1em" style={{transform: "scale(1.4)"}}/>}
        {value.command === "adjustVolume" && <FaVolumeUp size="1.05em"/>}
        {value.command === "adjustGain" && <FaVolumeUp size="1.05em"/>  }
        {value.command === "adjustPitch" && <FaMusic size="1em"/>}
        {value.command === "setState" && <FaPowerOff size="1em"/>}
        {(value.command === "setMark" && !specialKey) && <FaBookmark size="0.95em"/>}
        {specialKey && <FaStar size="1em"/>}
        {value.command === "seekMark" && <div className="svg">
          <FaArrowRight size="0.95em"/>
          <FaBookmark size="0.95em"/>
        </div>}
        {value.command === "toggleLoop" && <TiArrowLoop size="1.4em"/>}
        {value.command === "seek" && value.valueBool4 && <FaPercent size="0.95em"/>}
        {value.command === "seek" && !value.valueBool4 && <>
          {value.valueNumber < 0 && (
            <FaBackward size="0.95em"/>
          )}
          {value.valueNumber >= 0 && (
            <FaForward size="0.95em"/> 
          )}
        </>}
        {value.command === "adjustPan" && <TbArrowsHorizontal size="1.2em"/>}
        {value.command === "tabCapture" && <div className={`captureIcon ${value.enabled ? "active" : ""}`}><div></div></div>}
        <span onContextMenu={handleContextMenu}>{label}</span>
        {value.command === "seek"&& <>
          {!(props.hideIndicator || value.hideIndicator || value.valueBool4 || Math.abs(value.valueNumber) < 1) ? (
            <button title={window.gsm.command.showNetTooltip} className={`toggle ${props.showNetSpeed ? "active" : ""}`} onClick={e => {
              pushView({override: {showNetSeek: !props.showNetSpeed}})
  
              if (!props.showNetSpeed) {
                feedbackText(window.gsm.command.showNetTooltip, domRectGetOffset((e.target as HTMLButtonElement).getBoundingClientRect()))
              }
            }}>{":"}</button>
          ) : null}
          {!value.valueBool4 && (
            <button title={window.gsm.command.relativeTooltip} className={`toggle ${value.valueBool ? "active" : ""}`} onClick={e => {
              props.onChange(value.id, produce(value, d => {
                d.valueBool = !d.valueBool
              }))
  
              if (!value.valueBool) {
                feedbackText(window.gsm.command.relativeTooltip, domRectGetOffset((e.target as HTMLButtonElement).getBoundingClientRect()))
              }
            }}>{"×"}</button>
          )}
          <button title={"0% to 100%"} className={`toggle ${value.valueBool4 ? "active" : ""}`} onClick={e => {
            props.onChange(value.id, produce(value, d => {
              d.valueBool4 = !d.valueBool4
            }))

            if (!value.valueBool4) {
              feedbackText("0% to 100%", domRectGetOffset((e.target as HTMLButtonElement).getBoundingClientRect()))
            }
          }}>{"%"}</button>
        </>}
        {(HTMLMediaElement.prototype.fastSeek && (value.command === "seek" || value.command === "seekMark") && (Math.abs(value.valueNumber) >= 3 || value.command === "seekMark")) && <>
          <button title={window.gsm.command.fastSeekTooltip} className={`toggle ${value.valueBool2 ? "active" : ""}`} onClick={e => {
            props.onChange(value.id, produce(value, d => {
              d.valueBool2 = !d.valueBool2
            }))

            if (!value.valueBool2) {
              feedbackText(window.gsm.command.fastSeekTooltip, domRectGetOffset((e.target as HTMLButtonElement).getBoundingClientRect()), 2000)
            }
          }}>{"f"}</button>
        </>}
        {tooltip && <Tooltip label="?" tooltip={tooltip}/>}
        {value.command === "fullscreen" && <>
          <button style={{marginLeft: "10px"}} className={`toggle ${value.valueBool ? "active" : ""}`} onClick={e => {
            props.onChange(value.id, produce(value, d => {
              d.valueBool = !d.valueBool
            }))
          }}>{window.gsm.command.nativeTooltip}</button>
        </>}
        {commandInfo.valueType === "adjustMode" && <button className="adjustMode" onClick={e => {
          props.onChange(value.id, produce(value, d => {
            d.adjustMode = clamp(1, 3, ((d.adjustMode ?? 1) + 1) % 4)
          }))
        }}>
            {value.adjustMode === AdjustMode.SET && <FaEquals size="1em"/>}
            {value.adjustMode === AdjustMode.CYCLE && <FaList size="1em"/>}
            {value.adjustMode === AdjustMode.ADD && <FaPlus size="1em"/>}
        </button>}
      </div>
      {(commandInfo.withFilterTarget || commandInfo.withFilterOption) && (
        <div className="support" onContextMenu={handleContextMenu}>
          {commandInfo.withFilterTarget && (
            <select 
              value={value.filterTarget} 
              onChange={e => {
                props.onChange(value.id, produce(value, d => {
                  d.filterTarget = e.target.value as TargetFx
                }))
              }}
            >{filterTargets.map(v => {
              return <option key={v} value={v}>{(window.gsm.token as any)[v]}</option>
            })}</select>
          )}
          {commandInfo.withFilterOption && (
            <select 
              value={value.filterOption} 
              onChange={e => {
                props.onChange(value.id, produce(value, d => {
                  d.filterOption = e.target.value as FilterName
                  delete d.valueNumber
                  delete d.valueNumberAlt
                }))
              }}
            >{Object.entries(filterInfos).map(([k, v]) => {
              return <option key={k} value={k}>{window.gsm.filter[k as FilterName] || ""}</option>
            })}</select>
          )}
        </div>
      )}
    </div>
    {isFirefox() ? <div></div> : (
      <button className={`icon`} onClick={() => {
        if (value.command === "tabCapture") return 
        props.onChange(value.id, produce(value, d => {
          d.global = !value.global
        }))
      }}>{value.global ? <FaGlobe size="1.05em"/> : <FaFile size="1.05em"/>}</button>
    )}
    {value.global ? (
      <div className="globalPicker">
        <select value={value.globalKey || "commandA"} onChange={e => {
          props.onChange(value.id, produce(value, d => {
            d.globalKey = e.target.value 
          }))
        }}>
          {"ABCDEFGHIJKLMNO".split("").map(v => [`command${v}`, `command ${v}`]).map(v => (
            <option key={v[0]} value={v[0]}>{v[1]}</option>
          ))}
        </select>
        <button className={`icon`} onClick={() => {
          requestCreateTab(isFirefox() ? `https://support.mozilla.org/kb/manage-extension-shortcuts-firefox` :`chrome://extensions/shortcuts`)
        }}><FaLink size={17}/></button>
      </div>
    ) : (
      <KeyPicker value={value.key} onChange={newKey => {
        props.onChange(value.id, produce(value, d => {
          d.key = newKey
        }))
      }}/>
    )}
    {numericInput && (
      <NumericInput noNull={noNull} placeholder={defaultValue?.toString() ?? null} min={min} max={max} value={value[numericInput]} onChange={v => {
        props.onChange(value.id, produce(value, d => {
          d[numericInput] = v
        }))
      }}/>
    )}
    {commandInfo.valueType === "adjustMode" && value.adjustMode === AdjustMode.CYCLE && (
      <CycleInput min={min} max={max} values={value.valueCycle || []} onChange={v => {
        props.onChange(value.id, produce(value, d => {
          d.valueCycle = v
        }))
      }}/>
    )}
    {commandInfo.valueType === "string" && (
      <ThrottledTextInput passInput={specialKey ? {style: {color: "red"}} : undefined} value={value.valueString} onChange={v => {
        props.onChange(value.id, produce(value, d => {
          d.valueString = v
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
            d.valueState = e.target.value as StateOption
          }))
        }}
      >{(["on", "off", "toggle"] as StateOption[]).map(v => {
        return <option key={v} value={v}>{window.gsm.token[v] || ""}</option>
      })}</select>
    )}
    {!commandInfo.valueType && <div/>}
    <button className="icon" onClick={handleContextMenu}>
      <GoKebabVertical style={{pointerEvents: "none"}} title="..." size="1.3em"/>
    </button>
    <button className="icon" onClick={e => {
       props.onChange(value.id, produce(value, d => {
        d.spacing = ((value.spacing || 0) + 1) % 3
      }))
    }}>
      {!value.spacing && (
        <GoChevronUp title="1x spacing" size="1.3em"/>
        )} 
      {value.spacing === 1 && (
        <GoChevronDown title="2x spacing" size="1.3em"/>
        )} 
      {value.spacing === 2 && (
        <GoTriangleDown title="3x spacing" size="1.3em"/>
      )} 
    </button>
    <button className="close icon" onClick={e => props.onRemove(value.id)}>
      <GoX size="23px"/>
    </button>
  </div>
}