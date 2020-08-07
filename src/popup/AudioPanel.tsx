import React, { useState, useRef } from "react"
import { SliderPlus } from "../comps/SliderPlus";
import { FaVolumeUp, FaMusic } from "react-icons/fa";
import { CompressorControl } from "./CompressorControl";
import { EqualizerControl } from "./EqualizerControl";
import { useStateView } from "../hooks/useStateView";
import { useCaptureStatus } from "../hooks/useCaptureStatus";
import { MdAccessTime } from "react-icons/md";
import { PitchAnalyzer } from "./PitchAnalyzer";
import "./AudioPanel.scss"
import produce from "immer";

export function AudioPanel(props: {}) {
  const [view, setView] = useStateView({audioFx: true})
  const env = useRef({viaButton: true}).current
  const [compTab, setCompTab] = useState(false)
  const status = useCaptureStatus()

  if (!view) return <div className="panel"></div>
  const { audioFx } = view

  const ensureCaptured = () => {
    if (status) return 
    env.viaButton = false
    chrome.runtime.sendMessage({type: "TAB_CAPTURE", on: true, tabId: window.tabInfo.tabId})
  }

  return <div className="AudioPanel panel">
    <button className={`capture ${status ? "active" : ""}`} onClick={e => {
      env.viaButton = true 
      chrome.runtime.sendMessage({type: "TAB_CAPTURE", tabId: window.tabInfo.tabId})
    }}>{status ? window.gsm.audio.releaseTab : window.gsm.audio.captureTab}</button>
    {status && env.viaButton && <PitchAnalyzer/>}
    <SliderPlus
      label={<div>
        <FaMusic size="17px"/>
      <span style={{marginLeft: "10px"}}>{window.gsm.command.adjustPitch}</span>
      </div>}
      value={audioFx.pitch ?? 1}
      sliderMin={-1.5}
      sliderMax={1.5}
      default={0}
      onChange={newValue => {
        setView(produce(view, d => {
          d.audioFx.pitch = newValue 
        }))
        newValue !== 0 && ensureCaptured()
      }}
    />
    <SliderPlus
      label={<div>
        <FaVolumeUp size="17px"/>
        <span style={{marginLeft: "10px"}}>{window.gsm.command.adjustGain}</span>
        <button title={"mono"} style={{marginLeft: "10px"}} className={`toggle ${audioFx.mono ? "active" : ""}`} onClick={e => {
          setView(produce(view, d => {
            d.audioFx.mono = !d.audioFx.mono 
            d.audioFx.mono && ensureCaptured()
          }))
        }}>M</button>
      </div>}
      value={audioFx.volume ?? 1}
      sliderMin={0}
      sliderMax={3}
      min={0}
      default={1}
      onChange={newValue => {
        setView(produce(view, d => {
          d.audioFx.volume = newValue 
        }))
        newValue !== 1 && ensureCaptured()
      }}
    />
    <SliderPlus
      label={<div>
        <MdAccessTime size="20px"/>
        <span style={{marginLeft: "10px"}}>{window.gsm.command.adjustDelay}</span>
        <button style={{marginLeft: "10px"}} className={`toggle ${audioFx.delayMerge ? "active" : ""}`} onClick={e => {
          setView(produce(view, d => {
            d.audioFx.delayMerge = !d.audioFx.delayMerge
          }))
        }}>+</button>
      </div>}
      value={audioFx.delay ?? 0}
      sliderMin={0}
      sliderMax={5}
      min={0}
      max={60}
      default={0}
      onChange={newValue => {
        setView(produce(view, d => {
          d.audioFx.delay = newValue 
        }))
        newValue !== 0 && ensureCaptured()
      }}
    />
    <div className="tabs">
      <button className={`${!compTab ? "open" : ""} ${audioFx.eq.enabled ? "active" : ""}`} onClick={e => {
        setCompTab(false)
      }}>{window.gsm.audio.equalizer}</button>
      <button className={`${compTab ? "open" : ""} ${audioFx.comp.enabled ? "active" : ""}`} onClick={e => {
        setCompTab(true)
      }}>{window.gsm.audio.compressor}</button>
    </div>
    {compTab && (
      <CompressorControl value={audioFx.comp} onChange={newValue => {
        setView(produce(view, d => {
          d.audioFx.comp = newValue 
        }))
        newValue.enabled && ensureCaptured()
      }}/>
    )}
    {!compTab && (
      <EqualizerControl value={audioFx.eq} onChange={newValue => {
        setView(produce(view, d => {
          d.audioFx.eq = newValue
        }))
        newValue.enabled && ensureCaptured()
      }}/>
    )}
  </div>
}