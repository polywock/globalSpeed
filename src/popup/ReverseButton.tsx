import { useRef, useState } from "react"
import { FaMicrophone, FaVolumeUp } from "react-icons/fa"
import "./ReverseButton.scss"

type ReverseButtonProps = {
  onActivate?: () => void 
}

export function ReverseButton(props: ReverseButtonProps) {
  const env = useRef({info: null as Info}).current
  const [info, setInfo] = useState(null as Info)

  const disconnect = () => {
    if (!env.info) return 
    // disconnecting via popup
    env.info[0].disconnect()
    env.info = null 
    setInfo(null)
  }

  return (
    <button className={`ReverseButton ${info ? (info[1] ? "playing" : "recording") : "" }`} onMouseDown={e => {
      if (e.button !== 0) return 

      if (env.info) {
        disconnect()
        return 
      }

      props.onActivate?.()
      
      const port = chrome.runtime.connect({name: `REVERSE ${JSON.stringify({tabId: gvar.tabInfo.tabId})}`})
      env.info = [port, false]
      setInfo(env.info)

      port.onMessage.addListener(msg => {
        if (msg.type === "PLAYING") {
          env.info = [port, true]
          setInfo(env.info)
        }
      })

      port.onDisconnect.addListener(() => {
        env.info = null 
        setInfo(null)
      })

      window.addEventListener("mouseup", e => {
        if (e.button !== 0) return 

        if (env.info && !env.info[1]) {
          port.postMessage({type: "PLAY"})
        }
      }, {once: true, capture: true})
      

    }}>{info ? (info[1] ? <FaVolumeUp size="1em"/> : <FaMicrophone size="1em"/>) : window.gsm.audio.reverse}</button>
  )
}


type Info = [chrome.runtime.Port, boolean]