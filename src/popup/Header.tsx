import { useMemo } from "react"
import { checkFilterDeviation } from "../utils/configUtils"
import { GoPin, GoGear, GoMarkGithub, GoZap, GoArrowLeft} from "react-icons/go"
import { FaPowerOff, FaVolumeUp } from "react-icons/fa"
import { useStateView } from "../hooks/useStateView"
import { pushView } from "../background/GlobalState"
import { getDefaultFx } from "../defaults"
import "./Header.scss"
import { useCaptureStatus } from "../hooks/useCaptureStatus"

const SUPPORTS_TAB_CAPTURE = !!chrome.tabCapture?.capture

type HeaderProps = {
  panel: number
  setPanel: (newPanel: number) => void
}

export function Header(props: HeaderProps) {
  const [view, setView] = useStateView({enabled: true, isPinned: true, superDisable: true})

  if (!view) return <div></div>

  return (
    <div className="Header">
      <div 
        className={view.enabled ? "active" : "muted"}
        onClick={() => {
          pushView({override: {enabled: !view.enabled}, tabId: gvar.tabInfo.tabId})
        }}
        onContextMenu={e => {
          e.preventDefault()
          pushView({override: {superDisable: true}})
        }}
      >
        <FaPowerOff size="17px"/>
      </div>
      <div 
        className={`pin ${view.isPinned ? "active" : "muted"}`}
        onClick={() => {
          pushView({override: {isPinned: !view.isPinned}, tabId: gvar.tabInfo.tabId})
        }}
      >
        <GoPin size="20px"/>
      </div>
      {(props.panel === 0 && SUPPORTS_TAB_CAPTURE) ? (
        <AudioIcon onClick={() => props.setPanel(2)}/>
      ) : <div className="noPadding"/>}
      {props.panel === 0 ? (
        <FxIcon enabled={view?.enabled} onClick={() => props.setPanel(1)}/>
      ) : <div className="noPadding"/>}
      {props.panel !== 0 ? (
        <div 
          onClick={e => props.setPanel(0)}
        >
          <GoArrowLeft size="20px"/>
        </div>
      ) : <div className="noPadding"/>}
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



type FxIconProps = {
  onClick: () => void,
  enabled: boolean 
}

export function FxIcon(props: FxIconProps) {
  const [view, setView] = useStateView({elementFx: true, backdropFx: true})

  const fxActive = useMemo(() => {
    if (view && props.enabled) {
      if (view.backdropFx.enabled && (checkFilterDeviation(view.backdropFx.filters) ||checkFilterDeviation(view.backdropFx.transforms))) return true 
      if (view.elementFx.enabled && (checkFilterDeviation(view.elementFx.filters) ||checkFilterDeviation(view.elementFx.transforms))) return true 
    }
    return false 
  }, [props.enabled, view])

  return (
    <div 
      className={`beat ${fxActive ? "active" : ""}`} 
      onClick={e => props.onClick()}
      onContextMenu={e => {
        e.preventDefault()
        pushView({override: {elementFx: getDefaultFx(), backdropFx: getDefaultFx()}, tabId: gvar.tabInfo.tabId})
      }}
    >
      <GoZap size="20px"/>
    </div>
  )
}


type AudioIconProps = {
  onClick: () => void
}

export function AudioIcon(props: AudioIconProps) {
  const status = useCaptureStatus()

  return (
    <div 
      className={`beat ${status ? "active" : ""}`} 
      onClick={props.onClick}
      onContextMenu={e => {
        e.preventDefault()
        chrome.runtime.sendMessage({type: "TAB_CAPTURE", on: false, tabId: gvar.tabInfo.tabId})
      }}
    >
      <FaVolumeUp size="17px"/>
    </div>
  )
}