import React, { useState, useEffect, useMemo } from "react"
import { Keybind } from "../types"
import { DropdownWarning } from "../comps/DropdownWarning"
import { requestCreateTab } from "../utils/browserUtils"
import { FaLink } from "react-icons/fa"


type UnusedCommandWarningProps = {
  keybinds: Keybind[]
}

export function UnusedCommandWarning(props: UnusedCommandWarningProps) {
  const [unusedShortcuts, setUnusedShortcuts] = useState([] as chrome.commands.Command[])
 
  const env = useMemo(() => ({} as {keybinds?: Keybind[]}), [])
  env.keybinds = props.keybinds

  useEffect(() => {
    
    const handleInterval = () => {
      chrome.commands.getAll(cc => {
        setUnusedShortcuts(cc.filter(c => c.name.startsWith("command") && c.shortcut && (
          !env.keybinds.some(kb => kb.enabled && kb.global && (kb.globalKey || "commandA") === c.name)
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
    <DropdownWarning defaultExpanded={true} value={<div>
      <div>
        <span>{window.gsm.warnings.unusedGlobal}</span>
        <button style={{marginLeft: "10px", color: "currentColor"}} onClick={() => requestCreateTab(`chrome://extensions/shortcuts`)}><FaLink size={17}/></button>
      </div>
      {unusedShortcuts.map(b => (
        <div style={{marginTop: "15px"}} key={b.name}><b>{b.description}</b> = <code>{b.shortcut}</code></div>
      ))}
    </div>}/>
  )
}