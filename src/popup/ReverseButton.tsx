import { useRef, useState } from "react"
import { FaMicrophone, FaVolumeUp } from "react-icons/fa"
import { connectReversePort } from "src/background/utils/tabCapture"
import { getMediaDataWithScopes } from "src/background/utils/getAutoMedia"
import { sendMediaEvent } from "src/utils/configUtils"
import "./ReverseButton.css"
import { useTooltipAnchor } from "src/comps/Tooltip"

declare global {
  interface Message {
    PLAYING: {type: "PLAYING"}
  }
}

type ReverseButtonProps = {
  onActivate?: () => Promise<boolean>
}

export function ReverseButton(props: ReverseButtonProps) {
  const env = useRef({info: null as Info}).current
  const [status, setStatus] = useState(null as boolean)
  const reverseTip = useTooltipAnchor<HTMLButtonElement>({ label: gvar.gsm.audio.reverseTooltip, align: "top"})

  const ensureDisconnect = () => {
    window.removeEventListener("pointerup", onPointerUp, true)
    setStatus(null)
    
    if (!env.info) return
    env.info.port.disconnect()
    env.info.replay?.()
    env.info = null 
  }

  const onPointerUp = (e: PointerEvent) => {
    if (!env) return ensureDisconnect()
    if (env.info?.status === false) {
      env.info.port.postMessage({type: "PLAY"})
    }
  }

  const onMessage = (msg: Messages) => {
    if (!env.info) return ensureDisconnect()
    if (msg.type === "PLAYING") {  
      env.info.status = true 
      pauseAll(gvar.tabInfo.tabId).then(replay => {
        if (env.info) {
          env.info.replay = replay
        }
      })
      setStatus(true)
    }
  }

  const onPointerDown = async (e: React.PointerEvent) => {
    if (env.info) return ensureDisconnect()

    if (e.button !== 0) return 
    if (!await props.onActivate()) return 
    
    env.info = { port: await connectReversePort(gvar.tabInfo.tabId), status: false}
    env.info.port.onMessage.addListener(onMessage)
    env.info.port.onDisconnect.addListener(ensureDisconnect)
    window.addEventListener("pointerup", onPointerUp, true)

    setStatus(false)
  }

  return (
    <button ref={reverseTip} className={`toggle ReverseButton ${status == null ? "" : (status ? "enabled playing" : "enabled recording")}`} onPointerDown={onPointerDown}>{status == null ? gvar.gsm.audio.reverse : (status ? <FaVolumeUp size="1em"/> : <FaMicrophone size="1em"/>)}</button>
  )
}


type Info = {
  port: chrome.runtime.Port,
  status?: boolean,
  replay?: () => void
}

async function pauseAll(tabId: number): Promise<() => void> {
  const { scopes } = await getMediaDataWithScopes()
  let playFns: (() => void)[] = []
      
  for (let scope of scopes) {
    if (scope.tabInfo.tabId !== tabId) continue 

    for (let media of scope.media) {
      if (!(!media.paused && media.volume)) continue 

      sendMediaEvent({type: "PAUSE", state: "on"}, media.key, tabId, scope.tabInfo.frameId)

      playFns.push(() => {
        sendMediaEvent({type: "PAUSE", state: "off"},media.key, tabId, scope.tabInfo.frameId)
      })
    }
  }

  return () => {
    playFns.forEach(v => v())
  }
}