import { CSSProperties } from "react"
import { NumericControl } from "../comps/NumericControl"
import { getDefaultSpeedPresets } from "../defaults"
import { useStateView } from "../hooks/useStateView"
import { BsMusicNoteList } from "react-icons/bs"
import { pushView } from "../background/GlobalState"
import { clamp, domRectGetOffset, feedbackText } from "src/utils/helper"
import "./SpeedControl.scss"

type SpeedControlProps = {
  onChange: (newSpeed: number) => any,
  speed: number
}

export function SpeedControl(props: SpeedControlProps) {
  const [view] = useStateView({speedPresets: true, speedSmallStep: true, speedBigStep: true, speedSlider: true, freePitch: true, speedPresetRows: true, speedPresetPadding: true})
  if (!view) return null 

  let presets = view.speedPresets?.length === 12 ? view.speedPresets : getDefaultSpeedPresets()
  presets = presets.slice(0, clamp(1, 4, view.speedPresetRows ?? 4) * 3)
  
  return <div className="SpeedControl">
    <div className="options" style={{"--padding": `${view.speedPresetPadding ?? 0}px`} as CSSProperties}>
      {presets.map(v => (
        <button 
          key={v}
          className={props.speed === v ? "selected" : ""}
          onClick={() => props.onChange(v)}
        >{v.toFixed(2)}</button> 
      ))}
    </div>
    <NumericControl 
      value={props.speed} 
      onChange={newValue => props.onChange(newValue)}
      smallStep={view.speedSmallStep || 0.01}
      largeStep={view.speedBigStep || 0.1}
      min={0.07}
      max={16}
      inputNoNull={true}
      rounding={2}
    />
    {!!view.speedSlider && (
      <div className="slider">
        <BsMusicNoteList title={window.gsm.command.speedChangesPitch} size={"17px"} className={`${view.freePitch ? "active" : ""}`} onClick={e => {
          if (!view.freePitch) {
            feedbackText(window.gsm.command.speedChangesPitch, domRectGetOffset((e.target as HTMLButtonElement).getBoundingClientRect()))
          }
          pushView({override: {freePitch: !view.freePitch}})
        }}/>
        <input step={0.01} type="range" min={view.speedSlider.min} max={view.speedSlider.max} value={props.speed} onChange={e => {
          props.onChange(e.target.valueAsNumber)
        }}/>
      </div>
    )}
  </div>
}