import { MutableRefObject, useState } from "react"
import { Keybind, StateOption, AdjustMode, Trigger } from "../../types"
import { produce } from "immer"
import { KeyPicker } from "../../comps/KeyPicker"
import { NumericInput } from "../../comps/NumericInput"
import { commandInfos } from "../../defaults/commands"
import { CycleInput } from "../../comps/CycleInput"
import { ModalText } from "../../comps/ModalText"
import { FaGlobe, FaFile, FaBars, FaRegEdit } from "react-icons/fa"
import { requestCreateTab } from "../../utils/browserUtils"
import { domRectGetOffset, feedbackText, isFirefox, isMobile } from "../../utils/helper"
import { ThrottledTextInput } from "../../comps/ThrottledTextInput"
import { URLModal } from "../URLModal"
import { getDefaultURLCondition } from "../../defaults"
import { requestSyncContextMenu } from "src/utils/configUtils"
import { DurationSelect, NameArea, makeLabelWithTooltip } from "./NameArea"
import { Minmax } from "src/comps/Minmax"
import { KebabList, KebabListProps } from "../KebabList"
import { Tooltip } from "src/comps/Tooltip"
import "./styles.css"


export type KeybindControlProps = {
  onChange: (id: string, newValue: Keybind) => void,
  onRemove: (id: string) => void,
  onMove: (id: string, newIndex: number) => void,
  onDuplicate: (id: string) => void,
  value: Keybind,
  hideIndicator: boolean,
  virtualInput?: boolean
  listRef: MutableRefObject<HTMLElement>,
  isLast?: boolean
}

export const KeybindControl = (props: KeybindControlProps) => {
  const { value } = props
  const [show, setShow] = useState(false)

  const command = commandInfos[value.command]
  const urlAllowed = value.trigger !== Trigger.CONTEXT
  let adjustMode = command.valueType === "adjustMode" ? (value.adjustMode || AdjustMode.SET) : null

  let showNumericControl = false
  let showRange = false
  let ref = command.ref || command.getRef?.(command, value)

  let min = undefined as number
  let max = undefined as number
  let defaultValue = undefined as number
  let sliderMin = undefined as number
  let sliderMax = undefined as number


  if (ref) {
    min = ref.min
    max = ref.max
    defaultValue = ref.default
    sliderMin = ref.sliderMin
    sliderMax = ref.sliderMax

    if (adjustMode === AdjustMode.ADD || value.adjustMode === AdjustMode.ITC_REL) {
      min = null
      max = null
      defaultValue = adjustMode === AdjustMode.ADD ? ref.step : ref.itcStep
    }

    if (adjustMode === AdjustMode.ITC) {
      showRange = true
    } else if (adjustMode !== AdjustMode.CYCLE) {
      showNumericControl = true
    }

    if (command.valueType === "number") showNumericControl = true
  }


  const hasSpecial = value.command === "setMark" && ["::nameless", "::nameless-prev", "::nameless-next"].includes(value.valueString?.toLowerCase())


  const kebabList: KebabListProps["list"] = [
    { name: "duplicate", label: gvar.gsm.token.duplicate, close: true },
    { name: "label", label: gvar.gsm.options.editor.addLabel, close: true },
  ]

  urlAllowed && kebabList.push({ name: "url", label: gvar.gsm.options.rules.conditions, close: true })


  command.hasFeedback && kebabList.push({ name: "invertIndicator", label: gvar.gsm.options.flags.showIndicator, checked: props.hideIndicator ? value.invertIndicator : !value.invertIndicator })

    ; ((value.trigger || 0) === 0) && kebabList.push(
      { name: "blockEvents", checked: !!value.greedy, label: makeLabelWithTooltip(gvar.gsm.token.blockEvents, gvar.gsm.token.blockEventsTooltip, 'left') }
    )


  props.isLast || kebabList.push(
    { name: "spacing", label: gvar.gsm.options.editor.spacing, preLabel: value.spacing === 2 ? "2" : (value.spacing === 1 ? "1" : null) }
  )

  let onFocusTooltip: string 
  if (value.command === "nothing") {
    onFocusTooltip = gvar.gsm.command.afxDelay
  }
  


  return <div className="KeybindControl">

    {/* Url condition bubble */}
    {value.condition?.parts?.length ? (
      <div 
        className={`urlBubble`} 
        onClick={() => setShow(!show)}
        onContextMenu={e => {
          if (value.condition) {
            props.onChange(value.id, produce(value, d => {
              d.condition = getDefaultURLCondition()
            }))
            e.preventDefault()
          }
        }}
      >{value.condition.parts.length}</div>
    ) : <div className="displaynone"/>}

      {/* URL modal */}
      {!show ? null : (
        <URLModal onReset={() => {
          props.onChange(value.id, produce(value, d => {
            delete d.condition
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
        }} value={value.condition || getDefaultURLCondition(true)} />
      )}

      {/* Status */}
      <input type="checkbox" checked={!!value.enabled} onChange={e => {
        props.onChange(value.id, produce(value, d => {
          d.enabled = !value.enabled
          requestSyncContextMenu()
        }))
      }} />

      {/* Name area */}
      <NameArea command={command} onChange={props.onChange} value={value} hasSpecial={hasSpecial} reference={ref} />

      {/* Shortcut mode */}
      {isMobile() ? <div/> : (
        <Tooltip align="top" title={gvar.gsm.options.editor.triggerModes[value.trigger || Trigger.LOCAL]}>
          <button className={`buttonTooltip icon`} onClick={e => {
            let options = value.trigger === 2 ? [0, 1, 2] : (
              value.trigger === 1 ? [2, 0, 1] : [1, 2, 0]
            )
            if (value.command === "afxCapture") options.splice(options.indexOf(0), 1)
            if (isFirefox()) options.splice(options.indexOf(1), 1)

              let newest = options.shift() as Trigger

              props.onChange(value.id, produce(value, d => {
                d.trigger = newest
              }))

            requestSyncContextMenu()
          }}>
            {value.trigger === Trigger.GLOBAL ? <FaGlobe className="tr115"/> : (
              value.trigger === Trigger.CONTEXT ? <FaBars className="tr115"/> : <FaFile className="tr115" />
            )}
          </button>
        </Tooltip>
      )}
      <div className="talues">
        <TriggerValues value={value} onChange={props.onChange} virtualInput={props.virtualInput} />
        {(value.allowAlt && adjustMode === AdjustMode.CYCLE) && <TriggerValues value={value} onChange={props.onChange} virtualInput={props.virtualInput} isAlt={true} />}
      </div>

      {/* Numeric input */}
      {showNumericControl && !command.withDuration && (
        <NumericInput onFocus={onFocusTooltip ? (e => {
          feedbackText(onFocusTooltip, domRectGetOffset((e.currentTarget as HTMLInputElement).getBoundingClientRect(), 20, -50, true))
        }) : undefined} placeholder={defaultValue?.toString() ?? null} min={min} max={max} value={value.valueNumber} onChange={v => {
          props.onChange(value.id, produce(value, d => {
            d.valueNumber = v
          }))
        }} />
      )}

      {/* Duration with numeric iput  */}
      {showNumericControl && command.withDuration && <div className="frmax">
        <NumericInput placeholder={defaultValue?.toString() ?? null} min={min} max={max} value={value.valueNumber} onChange={v => {
          props.onChange(value.id, produce(value, d => {
            d.valueNumber = v
          }))
        }} />
        <DurationSelect value={value} onChange={props.onChange} adjustMode={adjustMode} />
      </div>}

      {/* Range input */}
      {showRange && (
        <Minmax defaultMin={sliderMin} defaultMax={sliderMax} realMin={min} realMax={max} min={value.valueItcMin} max={value.valueItcMax} onChange={(min, max) => {
          props.onChange(value.id, produce(value, d => {
            d.valueItcMin = min
            d.valueItcMax = max
          }))
        }} />
      )}

      {/* Cycle input */}
      {command.valueType === "adjustMode" && value.adjustMode === AdjustMode.CYCLE && (
        <CycleInput defaultValue={defaultValue} min={min} max={max} values={value.valueCycle || []} onChange={v => {
          props.onChange(value.id, produce(value, d => {
            d.valueCycle = v
          }))
        }} />
      )}

      {/* Text input */}
      {command.valueType === "string" && (
        <ThrottledTextInput passInput={hasSpecial ? { style: { color: "red" } } : undefined} value={value.valueString} onChange={v => {
          props.onChange(value.id, produce(value, d => {
            d.valueString = v
          }))
        }} />
      )}

      {/* Modal string input */}
      {command.valueType === "modalString" && (
        <ModalText label="edit code" value={value.valueString} onChange={v => {
          props.onChange(value.id, produce(value, d => {
            d.valueString = v
          }))
        }} />
      )}

      {/* State input  */}
      {command.valueType === "state" && (
        <select
          className="padded"
          value={value.valueState}
          onChange={e => {
            props.onChange(value.id, produce(value, d => {
              d.valueState = e.target.value as StateOption
            }))
          }}
        >{(["on", "off", "toggle"] as StateOption[]).map(v => {
          return <option key={v} value={v}>{gvar.gsm.token[v] || ""}</option>
        })}</select>
      )}

      {/* No input */}
      {!command.valueType && <div />}

      {/* Menu kebab */}
      <KebabList list={kebabList} onSelect={name => {
        if (name === "invertIndicator") {
          props.onChange(value.id, produce(value, d => {
            d.invertIndicator = !d.invertIndicator
            if (d.invertIndicator == null) delete d.invertIndicator
          }))
        } else if (name === "blockEvents") {
          props.onChange(value.id, produce(value, d => {
            d.greedy = !d.greedy
            if (d.greedy == null) delete d.greedy
          }))
        } else if (name === "autoPause") {
          props.onChange(value.id, produce(value, d => {
            d.autoPause = !d.autoPause
            if (d.autoPause == null) delete d.autoPause
          }))
        } else if (name === "url") {
          setShow(true)
        } else if (name === "duplicate") {
          props.onDuplicate(value.id)
        } else if (name === "spacing") {
          props.onChange(value.id, produce(value, d => {
            d.spacing = ((d.spacing || 0) + 1) % 3
          }))
        } else if (name === "label") {
          props.onChange(value.id, produce(value, d => {
            d.label = prompt()
            if (!d.label) delete d.label
          }))
        }
      }} />
    </div>
}

type Props = {
  value: Keybind,
  virtualInput?: boolean,
  onChange: (id: string, newValue: Keybind) => void,
  isAlt?: boolean
}

export const TriggerValues = (props: Props) => {
  const { value, isAlt } = props
  let keyForGlobal = (isAlt ? 'globalKeyAlt' : 'globalKey') as 'globalKey'
  let keyForLocal = (isAlt ? 'keyAlt' : 'key') as 'key'
  let keyForLabel = (isAlt ? 'contextLabelAlt' : 'contextLabel') as 'contextLabel'

  return <>
    {/* Global key picker */}
    {value.trigger === Trigger.GLOBAL && (
      (
        <div className="globalPicker">
          <select className="padded" value={value[keyForGlobal] || "commandA"} onChange={e => {
            props.onChange(value.id, produce(value, d => {
              d[keyForGlobal] = e.target.value
            }))
          }}>
            {"ABCDEFGHIJKLMNO".split("").map(v => [`command${v}`, `command ${v}`]).map(v => (
              <option key={v[0]} value={v[0]}>{v[1]}</option>
            ))}
          </select>
          <Tooltip title={gvar.gsm.token.assign} align="top">
            <button className="icon" onClick={() => {
              requestCreateTab(isFirefox() ? `https://support.mozilla.org/kb/manage-extension-shortcuts-firefox` : `chrome://extensions/shortcuts/#:~:text=${encodeURIComponent(`Command ${(value[keyForGlobal] || "commandA").slice(7)}`)}`)
            }}><FaRegEdit className="tr120" /></button>
          </Tooltip>
        </div>
      )
    )}

    {/* Local key picker */}
    {(value.trigger || Trigger.LOCAL) === Trigger.LOCAL && (
      <KeyPicker virtual={props.virtualInput} value={value[keyForLocal]} onChange={newKey => {
        props.onChange(value.id, produce(value, d => {
          d[keyForLocal] = newKey
        }))
      }} />
    )}

    {/* Context menu label */}
    {value.trigger === 2 && (
      <ThrottledTextInput placeholder={gvar.gsm.options.editor.menuLabel} value={value[keyForLabel]} onChange={newValue => {
        props.onChange(value.id, produce(value, d => {
          d[keyForLabel] = newValue
        }))
        requestSyncContextMenu()
      }} />
    )}
  </>
}