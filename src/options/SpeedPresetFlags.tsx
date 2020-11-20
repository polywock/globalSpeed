import produce from "immer"
import { pushView } from "../background/GlobalState"
import { NumericInput } from "../comps/NumericInput"
import { Reset } from "../comps/Reset"
import { getDefaultSpeedPresets } from "../defaults"
import { useStateView } from "../hooks/useStateView"
import { compareJson } from "../utils/helper"
import "./SpeedPresetFlags.scss"

export function SpeedPresetFlags(props: {className?: string}) {
  const [view] = useStateView({speedPresets: true, speedBigStep: true, speedSmallStep: true})
  if (!view) return null 

  const presets = view.speedPresets?.length === 12 ? view.speedPresets : getDefaultSpeedPresets()

  const handlePresetChange = (idx: number, newValue: number) => {
    pushView({override: {
      speedPresets: produce(presets, d => {
        d[idx] = newValue
      })
    }})
  }

  const handleStepChange = (newValue: number, big?: boolean) => {
    pushView({override: {
      [big ? "speedBigStep" : "speedSmallStep"]: newValue
    }})
  }

  const resetActive = !compareJson(
    [presets ?? getDefaultSpeedPresets(), view.speedSmallStep ?? 0.01, view.speedBigStep ?? 0.1], 
    [getDefaultSpeedPresets(), 0.01, 0.1]
  )

  return <>
    <div className="field marginTop">
      <div>
        <span style={{marginRight: "10px"}}>{window.gsm.options.editor.speedPresets}</span>
        <Reset active={resetActive} onClick={() => {
          pushView({override: {speedPresets: null, speedSmallStep: null, speedBigStep: null}})
        }}/>
      </div>
    </div>
    <div className="presetControl">
      {presets.map((v, i) => (
        <NumericInput key={i} value={v} onChange={t => handlePresetChange(i, t)} min={0.0625} max={16} noNull={true}/>
      ))}
      <span>{">"}</span>
      <NumericInput value={view.speedSmallStep || 0.01} onChange={t => handleStepChange(t, false)} min={0.001} noNull={false} placeholder={"0.01"}/>
      <span>{">>"}</span>
      <NumericInput value={view.speedBigStep || 0.1} onChange={t => handleStepChange(t, true)} min={0.001} noNull={false} placeholder={"0.1"}/>
    </div>
  </>
}