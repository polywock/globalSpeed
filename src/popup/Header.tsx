import React, { useContext } from "react"
import { persistConfig, setPin, getContext } from "../utils/configUtils"
import { GoPin, GoGear, GoMarkGithub, GoZap, GoArrowLeft} from "react-icons/go"
import { FaPowerOff } from "react-icons/fa"
import produce from "immer"
import { ConfigContext } from "../ConfigContext"
import "./Header.scss"

type HeaderProps = {
  fxPanal: boolean
  setFxPanal: (newValue: boolean) => void 
}

export function Header(props: HeaderProps) {
  const {config, tabId, pin, ctx} = useContext(ConfigContext)

  return (
    <div className="Header">
      <div 
        title="Suspend most functionality."
        className={`toggle ${ctx.enabled ? "active" : ""}`}
        onClick={() => {
          persistConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            dCtx.enabled = !dCtx.enabled
          }))
        }}
      >
        <FaPowerOff size="17px"/>
      </div>
      <div 
        title="Pinning (or Local Speed): Apply custom settings only to this tab."
        className={`pin toggle ${pin ? "active" : ""}`}
        onClick={() => {
          persistConfig(produce(config, dConfig => {
            setPin(dConfig, "toggle", tabId)
          }))
        }}
      >
        <GoPin size="20px"/>
      </div>
      {props.fxPanal ? (
        <div title="Go back to speed panal." onClick={() => {
          props.setFxPanal(!props.fxPanal)
        }}>
          <GoArrowLeft size="20px"/>
        </div>
      ) : (
        <div title="Open FX panal." onClick={() => {
          props.setFxPanal(!props.fxPanal)
        }}>
          <GoZap size="20px"/>
        </div>
      )}
      <div title="open options page." onClick={e => {
        chrome.runtime.openOptionsPage()
      }}>
        <GoGear size="20px"/>
      </div>
      <div title="open github page." onClick={e => {
        window.open("https://github.com/polywock/globalSpeed", "_blank")
      }}>
        <GoMarkGithub size="18px"/>
      </div>
    </div>
  )
}