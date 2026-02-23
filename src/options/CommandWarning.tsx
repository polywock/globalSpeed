import { useState, useEffect, useRef } from "react"
import { Keybind, Trigger } from "../types"
import { requestCreateTab } from "../utils/browserUtils"
import { FaLink } from "react-icons/fa"
import { MdWarning } from "react-icons/md"
import "./CommandWarning.css"



type Props = {
  keybinds: Keybind[]
}

export function CommandWarning(props: Props) {
  const [show, setShow] = useState(false)
 
  const env = useRef({} as {keybinds?: Keybind[], show?: boolean}).current
  env.show = show
  env.keybinds = props.keybinds

  useEffect(() => {
    
    const handleInterval = () => {
      chrome.commands.getAll(cc => {
        const target = cc.some(c => c.name.startsWith("command") && c.shortcut && (
          !env.keybinds.some(kb => kb.enabled && kb.trigger === Trigger.BROWSER && (kb.globalKey || "commandA") === c.name)
        ))
        target !== env.show && setShow(target)
      }) 
    }

    const intervalId = setInterval(handleInterval, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  if (!show) return null

  return <div className="CommandWarning">
    <MdWarning size={"1.15rem"}/>
    <span>{gvar.gsm.warnings.unusedGlobal}</span>
    <button onClick={() => requestCreateTab(`chrome://extensions/shortcuts#:~:text=${encodeURIComponent("Global Speed")}`)}>
      <FaLink size={"1.21rem"}/>
      <span>{gvar.gsm.token.openPage}</span>
    </button>
  </div>

 
}