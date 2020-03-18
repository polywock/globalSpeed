import React from "react"
import { setPin, getContext, getPin } from "../utils/configUtils"
import { GoPin, GoGear, GoMarkGithub, GoZap, GoArrowLeft} from "react-icons/go"
import { FaPowerOff, FaVolumeUp } from "react-icons/fa"
import produce from "immer"
import { Config } from "../types"
import "./Header.scss"
import { isFirefox } from "../utils/helper"

type HeaderProps = {
  fxPanal: boolean
  setFxPanal: (newValue: boolean) => void,
  config: Config,
  tabId: number,
  setConfig: (newConfig: Config) => void 
}

export function Header(props: HeaderProps) {
  const {config, tabId, setConfig} = props 

  const pin = getPin(config, tabId)
  const ctx = getContext(config, tabId)

  return (
    <div className="Header">
      <div 
        title={window.gsm["options_help_stateDesc"] || ""}
        className={`toggle ${ctx.enabled ? "active" : ""}`}
        onClick={() => {
          setConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            dCtx.enabled = !dCtx.enabled
          }))
        }}
      >
        <FaPowerOff size="17px"/>
      </div>
      <div 
        title={window.gsm["options_help_pinDesc"] || ""}
        className={`pin toggle ${pin ? "active" : ""}`}
        onClick={() => {
          setConfig(produce(config, dConfig => {
            setPin(dConfig, "toggle", tabId)
          }))
        }}
      >
        <GoPin size="20px"/>
      </div>
      {(!isFirefox() && pin) ? (
        <div 
          className={`toggle ${ctx.volume == null ? "" : "active"}`}
          onClick={e => {
            setConfig(produce(config, d => {
              let dCtx = getContext(d, tabId)
              dCtx.volume = dCtx.volume == null ? 1 : null
              if (dCtx.volume != null) {
                chrome.runtime.sendMessage({type: "CAPTURE_TAB", tabId})
              }
            }))
          }}
        >
          <FaVolumeUp size="17px"/>
        </div>
      ) : <div/>}
      {props.fxPanal ? (
        <div onClick={() => {
          props.setFxPanal(!props.fxPanal)
        }}>
          <GoArrowLeft size="20px"/>
        </div>
      ) : (
        <div title={window.gsm["options_help_fxDesc"] || ""} onClick={() => {
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