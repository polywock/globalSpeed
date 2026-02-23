import { useState, useRef, RefObject } from "react"
import { useStateView } from "../hooks/useStateView"
import { URLRule, URLStrictness } from "../types"
import { getDefaultURLRule, getDefaultFx, getDefaultURLCondition } from "../defaults"
import { NumericInput } from "../comps/NumericInput"
import { FxControl } from "../popup/FxControl"
import { isFirefox, moveItem, randomId } from "../utils/helper"
import { ModalText } from "../comps/ModalText"
import { URLModal } from "./URLModal"
import { getSelectedParts } from "@/utils/configUtils"
import { produce } from "immer"
import { List } from "./List"
import { ListItem } from "./ListItem"
import { KebabList, KebabListProps } from "./KebabList"
import { makeLabelWithTooltip } from "./keybindControl/NameArea"
import { GearIcon } from "@/comps/GearIcon"
import { DevWarning } from "./DevWarning"
import "./SectionRules.css"


export function SectionRules(props: {}) {
  const [view, setView] = useStateView({rules: true})
  const listRef = useRef<HTMLDivElement>(null)
  if (!view) return <div></div>

  const rules = view.rules || []

  const handleChange = (newRule: URLRule, remove?: boolean, duplicate?: boolean) => {
    setView({
      rules: produce(rules, d => {
        const idx = d.findIndex(v => v.id === newRule.id)
        if (remove) {
          if (idx < 0) return 
          d.splice(idx, 1)
          return 
        }

        if (duplicate) {
          if (idx < 0) return 
          const rule = structuredClone(newRule)
          rule.id = randomId()
          d.splice(idx, 0, rule)
          return 
        }

        if (idx >= 0) {
          d[idx] = newRule
        } else {
          d.push(newRule)
        }
      })
    })
  }

  const handleMove = (id: string, newIndex: number) => {
    setView({rules: produce(rules, d => {
      moveItem(d, v => v.id === id, newIndex)
    })})
  }

  const handleSpacingChange = (index: number) => {
    setView({rules: produce(rules, d => {
      const rule = rules[index]
      if (!rule) return 
      rule.spacing = ((rule.spacing || 0) + 1) % 3
    })})
  }

  return (
    <div className="section SectionRules">
      <h2>{gvar.gsm.options.rules.header}</h2>
      {isFirefox() ? null : <DevWarning forUrlRules={true} hasJs={rules?.some(r => r.enabled && r.type === "JS")}/>}
      <List listRef={listRef} spacingChange={handleSpacingChange}>
          {rules.map((rule, i) => (
            <ListItem key={rule.id} listRef={listRef} onMove={newIdx => handleMove(rule.id, newIdx)} spacing={rule.spacing} onRemove={() => handleChange(rule, true)} label={rule.label} onClearLabel={() => {
              handleChange(produce(rule, d => {
                delete d.label
              }))
            }}>
                <Rule isLast={i === rules.length - 1} listRef={listRef} rule={rule} onChange={handleChange}/>
            </ListItem>
          ))}
      </List>
      <button className="create" onClick={e => handleChange(getDefaultURLRule())}>{gvar.gsm.token.create}</button>
    </div>
  )
}



type RuleProps = {
  rule: URLRule,
  listRef: RefObject<HTMLElement>
  isLast?: boolean,
  onChange: (rule: URLRule, remove?: boolean, duplicate?: boolean) => void
}

export function Rule(props: RuleProps) {
  const { rule, onChange } = props
  const [ show, setShow ] = useState(false)

  const list: KebabListProps["list"] = [
    { name: "duplicate", label: gvar.gsm.token.duplicate, close: true },
    { name: "label", label: gvar.gsm.options.editor.addLabel, close: true },
    { name: "titleRestrict", label: makeLabelWithTooltip(rule.titleRestrict ? gvar.gsm.options.rules.clearTitleConditions : gvar.gsm.options.rules.setTitleConditions, gvar.gsm.options.rules.titleConditionsTooltip, 'left'), close: true },
  ]

  if (rule.type !== "JS") {
    list.push({ name: "strictness", label: makeLabelWithTooltip(gvar.gsm.options.rules.strictness, gvar.gsm.options.rules.strictnessTooltip, 'left'), preLabel: `${rule.strictness ?? URLStrictness.DIFFERENT_HOST}`})
  }

  props.isLast || list.push(
    { name: "spacing", label: gvar.gsm.options.editor.spacing, preLabel: props.rule.spacing === 2 ? "2" : (props.rule.spacing === 1 ? "1" : null) }
  )

  return (
    <div className="Rule">

      {/* Status */}
      <input type="checkbox" checked={!!rule.enabled} onChange={e => {
        onChange(produce(rule, d => {
          d.enabled = !d.enabled
        }))
      }}/>

      {/* URL conditions entry */}
      <button className="show" onClick={e => {
        setShow(!show)
      }}>{`— ${rule.condition ? getSelectedParts(rule.condition).length : 0} —`}</button>

      {/* URL conditions modal */}
      {show ? <URLModal onReset={() => {
        onChange(produce(rule, d => {
          delete d.condition
        }))
      }} onChange={v => {
        onChange(produce(rule, d => {
          d.condition = v 
        }))
      }} onClose={() => setShow(false)} value={rule.condition || getDefaultURLCondition()}/> : null}

      {/* Rule type */}
      <select value={rule.type} onChange={e => {
        onChange(produce(rule, d => {
          d.type = e.target.value as any
        }))
      }}>
        <option value="ON">{gvar.gsm.token.on}</option>
        <option value="OFF">{gvar.gsm.token.off}</option>
        <option value="SPEED">{gvar.gsm.command.speed}</option>
        <option value="FX">{gvar.gsm.command.fxFilter}</option>
        <option value="JS">{gvar.gsm.command.runCode}</option>
      </select>

      <div className="left">

        {/* Speed input  */}
        {rule.type == "SPEED" && (
          <NumericInput noNull={true} min={1 / 16} max={16} value={rule.overrideSpeed ?? 1} onChange={v => {
            onChange(produce(rule, d => {
              d.overrideSpeed = v
            }))
          }}/>
        )}

        {/* FX input  */}
        {rule.type == "FX" && (
          <FxRuleControl rule={rule} onChange={onChange}/>
        )}

        {/* JS input  */}
        {rule.type == "JS" && (
          <ModalText value={rule.overrideJs || ""} onChange={v => {
            onChange(produce(rule, d => {
              d.overrideJs = v
            }))
          }}/>
        )}
      </div>

      <KebabList list={list} onSelect={name => {
        if (name === "duplicate") {
          props.onChange(rule, false, true)
        } else if (name === "label") {
          props.onChange(produce(rule, d => {
            d.label = prompt()
            if (!d.label) delete d.label
          }))
        } else if (name === "spacing") {
          props.onChange(produce(rule, d => {
            d.spacing = ((d.spacing || 0) + 1) % 3 
          }))
        } else if (name === "strictness") {
          props.onChange(produce(rule, d => {
            d.strictness = (d.strictness ?? URLStrictness.DIFFERENT_HOST) % 4 + 1 
          }))
        } else if (name === "titleRestrict") {
          props.onChange(produce(rule, d => {
            d.titleRestrict = d.titleRestrict ? null : prompt(gvar.gsm.options.rules.titleConditionsLabel, "top hits, music, official video, live, lyrics")
          }))
        }
      }}/>
    </div>
  )
}


type FxRuleControlProps = {
  rule: URLRule,
  onChange: (rule: URLRule, remove?: boolean) => void
}

function FxRuleControl(props: FxRuleControlProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  let overrideFx = (props.rule.overrideFx || {}) as typeof props.rule.overrideFx
  overrideFx.backdropFx = overrideFx.backdropFx || getDefaultFx()
  overrideFx.elementFx = overrideFx.elementFx || getDefaultFx()

  return <div className="FxControlButton">
    <GearIcon onClick={e => setOpen(!open)}/>
    {open && (
      <div ref={wrapperRef} className="wrapper" onClick={e => {
        if (e.target === wrapperRef.current) setOpen(false)
      }}>
        <FxControl enabled={true} _elementFx={overrideFx.elementFx} _backdropFx={overrideFx.backdropFx} handleChange={(elementFx, backdropFx) => {
          props.onChange(produce(props.rule, d => {
            d.overrideFx = {
              elementFx,
              backdropFx
            }
          }))
        }}/>
      </div>
    )}
  </div>
}