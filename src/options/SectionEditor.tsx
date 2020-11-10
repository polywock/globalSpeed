import React, { useState } from "react"
import { Keybind } from "../types"
import { isFirefox, moveItem } from "../utils/helper"
import { commandInfos, CommandName, getDefaultKeybinds, availCommandInfos } from "../defaults/commands"
import { KeybindControl } from "./KeybindControl"
import { Tooltip } from "../comps/Tooltip"
import { UnusedCommandWarning } from "./UnusedCommandWarning"
import { useStateView } from "../hooks/useStateView"
import { FaFile, FaGlobe, FaLock } from "react-icons/fa"
import produce from "immer"
import "./SectionEditor.scss"
import { URLModal } from "./URLModal"
import { getDefaultURLCondition } from "../defaults"
import { pushView } from "../background/GlobalState"


export function SectionEditor(props: {}) {
  const [commandOption, setCommandOption] = useState("adjustSpeed")
  const [view, setView] = useStateView({keybinds: true})
  const [view2] = useStateView({keybindsUrlCondition: true})
  const [show, setShow] = useState(false)

  if (!view || !view2) return <div></div>

  const handleKeybindChange = (id: string, newKb: Keybind) => {
    setView(produce(view, d => {
      const idx = d.keybinds.findIndex(v => v.id === id)
      d.keybinds[idx] = newKb
    }))
  }

  const handleKeybindRemove = (id: string) => {
    setView({
      keybinds: view.keybinds.filter(v => v.id !== id)
    })
  }

  const handleKeybindMove = (id: string, down: boolean) => {
    setView(produce(view, d => {
      moveItem(d.keybinds, v => v.id === id, down)
    }))
  }

  return (
    <div className="section SectionEditor">
      <h2>{window.gsm.options.editor.header}</h2>
      {view.keybinds?.length > 0 && (
        <div className="dict">
          {isFirefox() ? null : (
            <div>
              <div className="toggleMode">
                <FaFile className="icon active" size={17}/>
                <div className="divider"></div>
                <FaGlobe className="icon active" size={17}/>
              </div>
              <div>
                <span>{window.gsm.options.editor.toggleMode}</span>
                <Tooltip pass={{style: {marginLeft: "10px"}}} tooltip={window.gsm.options.editor.toggleModeTooltip}/>
              </div>
            </div>
          )}
          <div>
            <FaLock className="icon active" size={17}/>
            <span>{window.gsm.options.editor.greedyMode}</span>
          </div>
        </div>
      )}
      {isFirefox() ? null : <UnusedCommandWarning keybinds={view.keybinds || []}/>}
      <div className="keybindControls">
        {(view.keybinds || []).map(bind => (
          <KeybindControl key={bind.id} value={bind} 
            onChange={handleKeybindChange} 
            onRemove={handleKeybindRemove}
            onMove={handleKeybindMove}
          />
        ))}
      </div>
      <div className="controls">
        <select value={commandOption} onChange={e => {
          setCommandOption(e.target.value)
        }}>
          {Object.entries(availCommandInfos).map(([k, v]) => (
            <option key={k} value={k}>{(window.gsm.command as any)[k]}</option>
          ))}
        </select>
        <button onClick={e => {
          setView({
            keybinds: [...view.keybinds, commandInfos[commandOption as CommandName].generate()]
          })
        }}>{window.gsm.token.create}</button>
        <button onClick={e => {
          setView({
            keybinds: getDefaultKeybinds()
          })
        }}>{window.gsm.token.reset}</button>
        <button onClick={() => setShow(!show)} className="urlRules">{`-- ${view2.keybindsUrlCondition?.parts?.length || 0} --`}</button>
        {show && <URLModal 
          value={view2.keybindsUrlCondition || getDefaultURLCondition()} 
          onClose={() => setShow(false)} 
          onReset={() => pushView({override: {keybindsUrlCondition: null}})}
          onChange={v => {
            pushView({override: {keybindsUrlCondition: v.parts.length ? v : null}})
          }}
          neutralValue={true}
        />}
      </div>
    </div>
  )
}



