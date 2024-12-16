import { useRef, useState } from "react"
import { AdjustMode, Keybind, StateView } from "../types"
import { areYouSure, isFirefox, moveItem, randomId } from "../utils/helper"
import { commandInfos, CommandName, getDefaultKeybinds, availableCommandNames } from "../defaults/commands"
import { KeybindControl } from "./keybindControl"
import { CommandWarning } from "./CommandWarning"
import { SetView, useStateView } from "../hooks/useStateView"
import { FaFile, FaGlobe } from "react-icons/fa"
import { produce } from "immer"
import { URLModal } from "./URLModal"
import { getDefaultURLCondition } from "../defaults"
import { requestSyncContextMenu } from "src/utils/configUtils"
import { ListItem } from "./ListItem"
import { List } from "./List"
import "./SectionEditor.css"
import { RegularTooltip } from "src/comps/RegularTooltip"
import { NewTooltip } from "src/comps/NewTooltip"
import { GrTooltip } from "react-icons/gr"

export function SectionEditor(props: {}) {
  const [view, setView] = useStateView({keybinds: true, keybindsUrlCondition: true, hideIndicator: true, virtualInput: true, freshKeybinds: true})
  
  if (!view) return <div></div>

  if (view.freshKeybinds) {
    handleFreshKeybinds(view, setView)
    return <div></div>
  }

  return (
    <div className="section SectionEditor">
      <h2>{gvar.gsm.options.editor.header}</h2>
      <EditorDescription hasKeybinds={view.keybinds.length >= 0}/>
      {isFirefox() ? null : <CommandWarning keybinds={view.keybinds || []}/>}
      {<EditorKeybinds view={view} setView={setView}/>}
      <EditorControls view={view} setView={setView}/>
    </div>
  )
}

function EditorDescription(props: {hasKeybinds: boolean}) {
  return (!props.hasKeybinds || isFirefox()) ? null : (
    <div className="header">
      <div>
          <FaFile className="icon active" size={"1.214rem"}/>
          <div></div>
          <FaGlobe className="icon active" size={"1.214rem"}/>
        </div>
        <NewTooltip rawOffsetX={60} offset={30} align="top" title={gvar.gsm.options.editor[isFirefox() ? 'triggerModeTooltipFf' : 'triggerModeTooltip']}>
            <span className="modeSpan">{gvar.gsm.options.editor.triggerMode}<GrTooltip/></span>
        </NewTooltip>
    </div>
  )
}

function EditorKeybinds(props: {view: StateView, setView: SetView}) {
  const { view, setView } = props
  const listRef = useRef<HTMLDivElement>()
  
  return (
    <List listRef={listRef} spacingChange={idx => onSpacingChange(setView, view, idx)}>
      {props.view.keybinds.map((kb, i) => (
        <ListItem key={kb.id} label={kb.label} spacing={kb.spacing} listRef={listRef} onMove={newIndex => onMove(setView, view, kb.id, newIndex)} onRemove={() => onRemove(setView, view, kb.id)} onClearLabel={() => {
          onChange(setView, view, kb.id, produce(kb, d => {
            delete d.label
          }))
        }}>
          <KeybindControl virtualInput={view.virtualInput} isLast={i === (view.keybinds?.length - 1)} listRef={listRef} hideIndicator={view.hideIndicator} key={kb.id} value={kb} 
            onChange={(id, newValue) => onChange(setView, view, id, newValue)} 
            onRemove={id => onRemove(setView, view, id)}
            onMove={(id, newIndex) => onMove(setView, view, id, newIndex)}
            onDuplicate={id => onDuplicate(setView, view, id)}
          />
        </ListItem>
      ))}
    </List>
  ) 
}

function onSpacingChange(setView: SetView, view: StateView, idx: number) {
  const kb = view.keybinds[idx]
  if (!kb) return 
  onChange(setView, view, kb.id, produce(kb, d => {
    d.spacing = ((d.spacing || 0) + 1) % 3
  }))
}

function onRemove(setView: SetView, view: StateView, id: string) {
  setView({
    keybinds: view.keybinds.filter(v => v.id !== id)
  })
  requestSyncContextMenu()
}


function onChange(setView: SetView, view: StateView, id: string, newKb: Keybind) {
  setView({
    keybinds: produce(view.keybinds, d => {
      const idx = d.findIndex(v => v.id === id)
      d[idx] = newKb
    })
  })
}

function onDuplicate(setView: SetView, view: StateView, id: string) {
  setView({
    keybinds: produce(view.keybinds, d => {
      const idx = d.findIndex(kb => kb.id === id)
      if (idx < 0) return 
      const source = view.keybinds[idx]
      const newKb = structuredClone(source)
      delete newKb.key
      newKb.id = randomId()
      newKb.spacing = source.spacing
      delete source.spacing
      d.splice(idx + 1, 0, newKb)
    })
  })
  requestSyncContextMenu()
}

function onMove(setView: SetView, view: StateView, id: string, newIndex: number) {
  setView({
    keybinds: produce(view.keybinds, d => {
      const oldIndex = moveItem(d, v => v.id === id, newIndex)
      
      const oldSpacing = d[oldIndex].spacing
      d[oldIndex].spacing =  d[newIndex].spacing
      d[newIndex].spacing = oldSpacing
    })
  })
  requestSyncContextMenu()
}

let options = structuredClone(availableCommandNames)
options.splice(3, 0, "presets")

function EditorControls(props: {view: StateView, setView: SetView}) {
  const { view, setView } = props
  const urlRuleCount = view.keybindsUrlCondition?.parts?.length || 0
  const [commandOption, setCommandOption] = useState("speed")
  const [presetOption, setPresetOption] = useState(null)
  const [show, setShow] = useState(false)
  let showPresets = commandOption === "presets"

  return (
    <div className="controls" style={{"--controls-column-count": showPresets ? 4 : 3} as React.CSSProperties}>

      {/* Primary select */}
      <select value={commandOption} onChange={e => {
        setCommandOption(e.target.value)
      }}>
        {options.map((name, i) => (
          <option disabled={name == null} key={name || i} value={name}>{name ? (gvar.gsm.command as any)[name] : "------"}</option>
        ))}
      </select>

      {/* Secondary select */}
      {showPresets && (
        <select style={{marginRight: "10px"}} value={presetOption ?? presets[0].name} onChange={e => {
            setPresetOption(e.target.value)
          }}>
            {presets.map(preset => (
              <option key={preset.name} value={preset.name}>{(gvar.gsm.command as any)[preset.name]}</option>
            ))}
          </select>
      )}

      {/* Create */}
      <button onClick={e => {
        if (commandOption === "presets") {
          let preset = presets.find(v => v.name === presetOption) ?? presets[0]
          if (preset) {
              setView({
                keybinds: [...produce(view.keybinds, d => {
                  d.at(-1).spacing = 2 
                }), ...preset.getKbs(view.hideIndicator)]
              })
          }
          return 
        }
        setView({
          keybinds: [...view.keybinds, commandInfos[commandOption as CommandName].generate()]
        })
      }}>{gvar.gsm.token.create}</button>

      {/* Reset */}
      <button onClick={e => {
        if (!areYouSure()) return 
        setView({
          keybinds: getDefaultKeybinds(),
          keybindsUrlCondition: null,
          freshKeybinds: true
        })
        requestSyncContextMenu()
      }}>{gvar.gsm.token.reset}</button>

      {/* URL conditions */}
      <button  onClick={() => setShow(!show)} onContextMenu={e => {
        e.preventDefault()
        setView({keybindsUrlCondition: null})
      }} className={`${urlRuleCount ? "error" : "blue"}`}>{`${gvar.gsm.options.rules.conditions}: ${urlRuleCount}`}</button>

      {/* URL conditions modal */}
      {show && <URLModal 
        value={view.keybindsUrlCondition || getDefaultURLCondition(true)} 
        onClose={() => setShow(false)} 
        onReset={() => setView({keybindsUrlCondition: null})}
        onChange={v => {
          setView({keybindsUrlCondition: v.parts.length ? v : null})
        }}
      />}
    </div>
  ) 
}

function handleFreshKeybinds(view: StateView, setView: SetView) {
  setView({
    keybinds: produce(view.keybinds, d => {
      d.forEach(kb => {
        switch (kb.replaceWithGsm) {
          case 1:
            kb.contextLabel = gvar.gsm.command.afxPitch
            break 
          case 2:
            kb.contextLabel = gvar.gsm.command.afxGain
            break 
          case 3:
            kb.contextLabel = gvar.gsm.command.afxReset
            break 
          case 4:
            kb.contextLabel = gvar.gsm.command.drawPage
            break 
          case 5:
            kb.contextLabel = `fx :: ${gvar.gsm.token.reset}`
            break 
          case 6:
            kb.contextLabel = `fx :: ${gvar.gsm.menuLabels.invertPage}`
            break 
          case 7:
            kb.contextLabel = `fx :: ${gvar.gsm.menuLabels.grayscalePage}`
            break 
          case 8:
            kb.contextLabel = `fx :: ${gvar.gsm.menuLabels.videoBrightness}`
            break 
          case 9:
            kb.contextLabel = `fx :: ${gvar.gsm.menuLabels.videoContrast}`
            break 
          case 10:
            kb.contextLabel = gvar.gsm.command.cinema
            break 
        }
        delete kb.replaceWithGsm 
      })
    }),
    freshKeybinds: false 
  })
  requestSyncContextMenu()
}

let presets: {name: string, getKbs: (hideIndicator: boolean) => Keybind[]}[] = [
  {name: "temporarySpeed", getKbs: hideIndicator => ([
    {...commandInfos.speed.generate(), skipToggleSpeed: true, valueNumber: 3, key: "KeyG", adjustMode: AdjustMode.SET, label: gvar.gsm.command.temporarySpeedTooltip},
    {...commandInfos.nothing.generate(), valueNumber: 0.15, key: "KeyG"},
    {...commandInfos.speed.generate(), valueNumber: 3, key: "KeyG", adjustMode: AdjustMode.SET, invertIndicator: hideIndicator ? undefined : true}
  ])}
]