import React, { useContext } from "react"
import { persistConfig, setPin, getContext } from "../utils/configUtils"
import { GoPin, GoGear, GoMarkGithub, GoVersions, GoZap, GoArrowLeft} from "react-icons/go"
import { FaPowerOff } from "react-icons/fa"
import produce from "immer"
import { ConfigContext } from "../ConfigContext"
import "./Header.scss"


export function Header(props: {}) {
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
      <div 
        title="Recursive, slightly slower, but compatible with more sites like Apple TV+."
        className={`toggle ${ctx.recursive ? "active" : ""}`}
        onClick={() => {
          persistConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            dCtx.recursive = !dCtx.recursive
          }))
        }}
      >
        <GoVersions size="20px"/>
      </div>
      {config.fxPanal ? (
        <div title="Go back to speed panal." onClick={() => {
          persistConfig(produce(config, dConfig => {
            dConfig.fxPanal = !dConfig.fxPanal 
          }))
        }}>
          <GoArrowLeft size="20px"/>
        </div>
      ) : (
        <div title="Open FX panal." onClick={() => {
          persistConfig(produce(config, dConfig => {
            dConfig.fxPanal = !dConfig.fxPanal 
          }))
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