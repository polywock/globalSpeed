import { useState } from "react"
import { Keybind } from "../types"
import { areYouSure, isFirefox, moveItem } from "../utils/helper"
import { commandInfos, CommandName, getDefaultKeybinds, availableCommandNames } from "../defaults/commands"
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
  const [urlView] = useStateView({keybindsUrlCondition: true})
  const [show, setShow] = useState(false)

  if (!view || !urlView) return <div></div>

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

  const urlRuleCount = urlView.keybindsUrlCondition?.parts?.length || 0

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
          {availableCommandNames.map((name, i) => (
            <option disabled={name == null} key={name || i} value={name}>{name ? (window.gsm.command as any)[name] : "------"}</option>
          ))}
        </select>
        <button onClick={e => {
          setView({
            keybinds: [...view.keybinds, commandInfos[commandOption as CommandName].generate()]
          })
        }}>{window.gsm.token.create}</button>
        <button onClick={e => {
          if (!areYouSure()) return 
          setView({
            keybinds: getDefaultKeybinds()
          })
          pushView({override: {keybindsUrlCondition: null}})
        }}>{window.gsm.token.reset}</button>
        <button  onClick={() => setShow(!show)} onContextMenu={e => {
          e.preventDefault()
          pushView({override: {keybindsUrlCondition: null}})
        }} className={`${urlRuleCount ? "error" : ""}`}>{`-- ${urlRuleCount} --`}</button>
        {show && <URLModal 
          value={urlView.keybindsUrlCondition || getDefaultURLCondition()} 
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



