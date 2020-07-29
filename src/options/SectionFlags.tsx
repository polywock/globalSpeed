import React from "react"
import { Tooltip } from "../comps/Tooltip"
import { LOCALE_MAP } from "../defaults/i18"
import { useStateView } from "../hooks/useStateView"
import { pushView } from "../background/GlobalState"
import { createFeedbackAudio } from "../utils/configUtils"
import "./SectionFlags.scss"
import { isFirefox } from "../utils/helper"

let feedbackAudio: HTMLAudioElement

export function SectionFlags(props: {}) {
  const [view, setView] = useStateView({language: true, darkTheme: true, hideBadge: true, hideIndicator: true, staticOverlay: true, pinByDefault: true, ghostMode: true, hideMediaView: true})
  const [volumeView, setVolumeView] = useStateView({feedbackVolume: true})
  if (!view || !volumeView) return <div></div>

  return (
    <div className="section SectionFlags">
      <h2>{window.gsm.options.flags.header}</h2>
      <div className="fields">
        <div className="field">
          <div className="labelWithTooltip">
            <span>{window.gsm.options.flags.language}</span>
            <Tooltip tooltip={window.gsm.options.flags.languageTooltip}/>
          </div>
          <select value={view.language || "detect"} onChange={e => {
            pushView({override: {language: e.target.value}})
            setTimeout(() => {
              window.location.reload()
            }, 100) 
          }}>
            {Object.keys(LOCALE_MAP).map(key => (
              <option key={key} value={key} title={LOCALE_MAP[key].title}>{LOCALE_MAP[key].display}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>{window.gsm.options.flags.darkTheme}</span>
          <input type="checkbox" checked={view.darkTheme || false} onChange={e => {
            pushView({override: {darkTheme: !view.darkTheme}})
          }}/>
        </div>
        <div className="field">
          <div className="labelWithTooltip">
            <span>{window.gsm.options.flags.pinByDefault}</span>
            <Tooltip tooltip={window.gsm.options.flags.pinByDefaultTooltip}/>
          </div>
          <input type="checkbox" checked={view.pinByDefault || false} onChange={e => {
            pushView({override: {pinByDefault: !view.pinByDefault}})
          }}/>
        </div>
        <div className="field">
          <div className="labelWithTooltip">
            <span>{window.gsm.options.flags.hideIndicator}</span>
            <Tooltip tooltip={window.gsm.options.flags.hideIndicatorTooltip}/>
          </div>
          <input type="checkbox" checked={view.hideIndicator || false} onChange={e => {
            pushView({override: {hideIndicator: !view.hideIndicator}})
          }}/>
        </div>
        <div className="field">
          <div className="labelWithTooltip">
            <span>{window.gsm.options.flags.hideBadge}</span>
            <Tooltip tooltip={window.gsm.options.flags.hideBadgeTooltip}/>
          </div>
          <input type="checkbox" checked={view.hideBadge || false} onChange={e => {
            pushView({override: {hideBadge: !view.hideBadge}})
          }}/>
        </div>
        <div className="field">
          <span>{window.gsm.options.flags.hideMediaView}</span>
          <input type="checkbox" checked={view.hideMediaView || false} onChange={e => {
            pushView({override: {hideMediaView: !view.hideMediaView}})
          }}/>
        </div>
        {isFirefox() ? null : (
          <div className="field">
            <span>{window.gsm.options.flags.feedbackVolume}</span>
            <input list="feedbackVolumeList" min={0} max={1} step={0.05} type="range" value={volumeView.feedbackVolume ?? 0.5} onChange={e => {
              feedbackAudio = feedbackAudio || createFeedbackAudio()
              feedbackAudio.volume = e.target.valueAsNumber
              feedbackAudio.currentTime = 0
              feedbackAudio.play()
              setVolumeView({
                feedbackVolume: e.target.valueAsNumber
              })
            }}/>
            <datalist id="feedbackVolumeList">
              <option value="0.5"></option>
            </datalist>
          </div>
        )}
        <div className="field">
          <span>{window.gsm.options.flags.fullscreenSupport}</span>
          <input type="checkbox" checked={!view.staticOverlay} onChange={e => {
            pushView({override: {staticOverlay: !view.staticOverlay}})
          }}/>
        </div>
        <div className="field">
          <div className="labelWithTooltip">
            <span>{window.gsm.options.flags.ghostMode}</span>
            <Tooltip tooltip={window.gsm.options.flags.ghostModeTooltip}/>
          </div>
          <input type="checkbox" checked={view.ghostMode} onChange={e => {
            pushView({override: {ghostMode: !view.ghostMode}})
          }}/>
        </div>
      </div>
    </div>
  )
}