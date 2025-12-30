import { useState, useEffect, useRef } from "react"
import { canPotentiallyUserScriptExecute, canUserScript, requestCreateTab } from "../utils/browserUtils"
import { FaLink } from "react-icons/fa"
import { MdWarning } from "react-icons/md"
import { isEdge } from "src/utils/helper"

enum WarningType {
    NONE = 0,
    ENABLE_DEV = 1,
    NO_SUPPORT = 2
}

export function DevWarning(props: {
    hasJs?: boolean,
    forUrlRules?: boolean
  }) {
  const [show, setShow] = useState(0 as WarningType)
  const env = useRef({} as {show: typeof show}).current
  env.show = show 

  useEffect(() => {
    if (!props.hasJs) {
        setShow(null)
        return
    } 

    const handleInterval = () => {
        let target = WarningType.NO_SUPPORT
        if (canPotentiallyUserScriptExecute()) {
            target = canUserScript() ? WarningType.NONE : WarningType.ENABLE_DEV
        }

        target !== env.show && setShow(target)
        env.show = target
    }

    const intervalId = setInterval(handleInterval, 300)

    return () => {
      clearInterval(intervalId)
    }
  }, [props.hasJs])

  if (!show) return null

  return <div className="CommandWarning">
    <MdWarning size={"1.15rem"}/>
    {show === WarningType.ENABLE_DEV && (
        <span>{gvar.gsm.warnings[`${props.forUrlRules ? "jsWarningRules" : "jsWarning"}${isEdge() ? 'Edge' : ''}`]}</span>
    )}
    {show === WarningType.NO_SUPPORT && (
        <span>{gvar.gsm.warnings.jsUpdate}</span>
    )}
    {show === WarningType.ENABLE_DEV && (
        <button onClick={() => isEdge() ? requestCreateTab(`chrome://extensions`) : requestCreateTab(`chrome://extensions/?id=${chrome.runtime.id}#:~:text=${encodeURIComponent("Allow User Scripts")}`)}>
            <FaLink size={"1.21rem"}/>
            <span>{gvar.gsm.token.openPage}</span>
        </button>
    )}
  </div>

 
}