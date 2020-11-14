import { formatDuration, formatDomain } from "../utils/helper"
import { FaPlay, FaPause, FaBackward, FaForward, FaMousePointer } from "react-icons/fa"
import { MdPictureInPictureAlt } from "react-icons/md"
import { FaVolumeMute, FaVolumeUp, FaVolumeDown } from "react-icons/fa"
import { sendMediaEvent } from "../utils/configUtils"
import { MediaEvent } from "../contentScript/utils/applyMediaEvent"
import { FlatMediaInfo } from "../contentScript/utils/genMediaInfo"
import { MediaPath } from "../types"
import "./MediaView.scss"

const HAS_REQUEST_PIP = !!(HTMLVideoElement.prototype.requestPictureInPicture)


type MediaViewProps = {
  info: FlatMediaInfo
}

export function MediaView(props: MediaViewProps) {
  const { info } = props
  const { tabId, frameId } = info.tabInfo

  let parts: string[] = [
    formatDomain(info.domain),
    formatDuration(info.duration)
  ]


  return (
    <div className={`MediaView`}>
      <div className="header" title={info.metaTitle || info.title}>{parts.join(" • ")}
      </div>
      <div className="controls" key={info.key}>
        <button onClick={e => {
          const event: MediaEvent = {type: "SEEK", value: -5, relative: true}
          sendMediaEvent(event, info.key, tabId, frameId)
        }}><FaBackward size={15}/></button>
        <button onClick={e => {
          const event: MediaEvent = {type: "PAUSE", state: "toggle"}
          sendMediaEvent(event, info.key, tabId, frameId)
        }}>{info.paused ? <FaPlay size={16}/> : <FaPause size={16}/>}</button>
        <button onClick={e => {
          const event: MediaEvent = {type: "SEEK", value: 5, relative: true}
          sendMediaEvent(event, info.key, tabId, frameId)
        }}><FaForward size={15}/></button>
        {!info.hasAudioTrack ? <><div/><div/></> : <>
          <button onClick={e => {
            const event: MediaEvent = {type: "MUTE", state: "toggle"}
            sendMediaEvent(event, info.key, tabId, frameId)
          }}>{info.muted ? <FaVolumeMute size={16}/> : info.volume > 0.5 ? <FaVolumeUp size={16}/> : <FaVolumeDown size={16}/>}</button>
          <input className="slider" onChange={e => {
            const event: MediaEvent = {type: "SET_VOLUME", value: e.target.valueAsNumber, relative: false}
            sendMediaEvent(event, info.key, tabId, frameId)
          }} type="range" min={0} max={1} step={0.1} value={info.volume}/>
        </>} 
        {(!(HAS_REQUEST_PIP && info.hasVideoTrack && info.duration)) ? <div/> : (
          <button className={info.pipMode ? "active" : ""} onClick={e => {
            const event: MediaEvent = {type: "TOGGLE_PIP"}
            sendMediaEvent(event, info.key, tabId, frameId)
          }}><MdPictureInPictureAlt size={18}/></button>
        )}
        <button title={window.gsm.warnings.selectTooltip} className={info.pinned ? "active" : ""} onClick={e => {
          chrome.runtime.sendMessage({type: "MEDIA_SET_PIN", value: info.pinned ? null : ({
            key: info.key,
            tabInfo: info.tabInfo
          }) as MediaPath})
        }}><FaMousePointer size={18}/></button>
      </div>
    </div>
  )
}