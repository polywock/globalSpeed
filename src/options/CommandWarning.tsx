import { useState, useEffect, useMemo } from "react"
import { Keybind, Trigger } from "../types"
import { DropdownWarning } from "../comps/DropdownWarning"
import { requestCreateTab } from "../utils/browserUtils"
import { FaLink } from "react-icons/fa"
import "./CommandWarning.css"



type Props = {
  keybinds: Keybind[]
}

export function CommandWarning(props: Props) {
  const [unusedShortcuts, setUnusedShortcuts] = useState([] as chrome.commands.Command[])
 
  const env = useMemo(() => ({} as {keybinds?: Keybind[]}), [])
  env.keybinds = props.keybinds

  useEffect(() => {
    
    const handleInterval = () => {
      chrome.commands.getAll(cc => {
        setUnusedShortcuts(cc.filter(c => c.name.startsWith("command") && c.shortcut && (
          !env.keybinds.some(kb => kb.enabled && kb.trigger === Trigger.GLOBAL && (kb.globalKey || "commandA") === c.name)
        )))
      }) 
    }

    const intervalId = setInterval(() => {
      handleInterval()
    }, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  if (!unusedShortcuts.length) return null

  return (
    <DropdownWarning defaultExpanded={true} value={<div className="CommandWarningBody">
      <div>
        <span>{gvar.gsm.warnings.unusedGlobal}</span>
        <button onClick={() => requestCreateTab(`chrome://extensions/shortcuts#:~:text=${encodeURIComponent("Global Speed")}`)}>
          <FaLink size={"1.21rem"}/>
          <span>{gvar.gsm.token.openPage}</span>
        </button>
      </div>
      {unusedShortcuts.map(b => (
        <div style={{marginTop: "15px"}} key={b.name}><b>{b.description}</b> = <code>{b.shortcut}</code></div>
      ))}
    </div>}/>
  )
}