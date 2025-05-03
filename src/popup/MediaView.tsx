import { formatDuration, formatDomain, feedbackText } from "../utils/helper"
import { FaPlay, FaPause, FaBackward, FaForward, FaMousePointer } from "react-icons/fa"
import { MdPictureInPictureAlt } from "react-icons/md"
import { FaVolumeMute, FaVolumeUp, FaVolumeDown } from "react-icons/fa"
import { sendMediaEvent } from "../utils/configUtils"
import type { MediaEvent } from "../contentScript/isolated/utils/applyMediaEvent"
import { FlatMediaInfo, MediaPath } from "../contentScript/isolated/utils/genMediaInfo"
import { GrRevert } from "react-icons/gr"
import "./MediaView.css"

const HAS_REQUEST_PIP = !!(HTMLVideoElement.prototype.requestPictureInPicture)


export function MediaView(props: {info: FlatMediaInfo, pinned: boolean}) {
  const { info, pinned } = props
  const { tabId, frameId } = info.tabInfo

  let parts: string[] = [
    info.displayDomain || formatDomain(info.domain)
  ]

  if (!info.infinity && info.duration) parts.push(formatDuration(info.duration))

  const differentTab = gvar.tabInfo && gvar.tabInfo.tabId !== tabId

  return (
    <div className={`MediaView`}>

      {/* Header */}
      <div className="header">
        <span onClick={async e => {
          let probe = await chrome.tabs.sendMessage(info.tabInfo.tabId, {type: 'MEDIA_PROBE', key: info.key, formatted: true} as Messages, {frameId: info.tabInfo.frameId || 0})
          if (!probe) return
          feedbackText(probe.formatted, {y: (e.target as HTMLDivElement).getBoundingClientRect().top - 50}, 1000 * 30) 
        }} className="meta" title={info.domain}>
          {parts.join(info.shadowMode == null ? " • " : info.shadowMode === "open" ? " / " : ` \ `)}
        </span>
        {differentTab && (
          <button className="jump" onClick={() => {
            chrome.tabs.update(tabId, {active: true})
          }}><GrRevert/></button>
        )}
        {info.displayTitle && <div className="title" title={info.title}>{info.displayTitle}</div>}
      </div>

      {/* Controls */}
      <div className="controls" key={info.key}>

        {/* Seek back */}
        <button onClick={e => {
          const event: MediaEvent = {type: "SEEK", value: -5, relative: true}
          sendMediaEvent(event, info.key, tabId, frameId)
        }}><FaBackward size={"1.07rem"}/></button>

        {/* Pause */}
        <button onClick={e => {
          const event: MediaEvent = {type: "PAUSE", state: "toggle"}
          sendMediaEvent(event, info.key, tabId, frameId)
        }}>{info.paused ? <FaPlay size={"1.14rem"}/> : <FaPause size={"1.14rem"}/>}</button>

        {/* Seek forwards */}
        <button onClick={e => {
          const event: MediaEvent = {type: "SEEK", value: 5, relative: true}
          sendMediaEvent(event, info.key, tabId, frameId)
        }}><FaForward size={"1.07rem"}/></button>

        {/* Volume */}
        {!info.hasAudioTrack ? <><div/><div/></> : <>
          <button onClick={e => {
            const event: MediaEvent = {type: "MUTE", state: "toggle"}
            sendMediaEvent(event, info.key, tabId, frameId)
          }}>{info.muted ? <FaVolumeMute size={"1.14rem"}/> : info.volume > 0.5 ? <FaVolumeUp size={"1.14rem"}/> : <FaVolumeDown size={"1.14rem"}/>}</button>
          <input className="slider" onChange={e => {
            const event: MediaEvent = {type: "SET_VOLUME", value: e.target.valueAsNumber, relative: false}
            sendMediaEvent(event, info.key, tabId, frameId)
          }} type="range" min={0} max={1} step={0.1} value={info.volume}/>
        </>} 
        
        {/* PiP */}
        {(!(HAS_REQUEST_PIP && info.hasVideoTrack && info.duration)) ? <div/> : (
          <button className={info.pipMode ? "active" : ""} onClick={e => {
            const event: MediaEvent = e.shiftKey ? {type: "FULLSCREEN", direct: true} : {type: "PIP"}
            sendMediaEvent(event, info.key, tabId, frameId)
          }}><MdPictureInPictureAlt size={"1.285rem"}/></button>
        )}

        {/* Select */}
        <button title={gvar.gsm.warnings.selectTooltip} className={pinned ? "active" : ""} onClick={e => {
          chrome.storage.session.set({[`m:pin`]: pinned ? null : ({
            key: info.key,
            tabInfo: info.tabInfo
          }) as MediaPath})
        }}><FaMousePointer size={"1.285rem"}/></button>
        
      </div>
    </div>
  )
}