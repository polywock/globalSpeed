import { produce } from "immer"
import { ModalBase } from "../comps/ModalBase"
import { CSSProperties } from "react"
import { SegmentedButtons } from "@/comps/SegmentedButtons"
import { SliderMicro } from "@/comps/SliderMicro"
import { clamp } from "@/utils/helper"
import { NumericInput } from "../comps/NumericInput"
import { getDefaultSpeedPresets } from "@/defaults/constants"
import { useStateView } from "../hooks/useStateView"
import "./SpeedPresetModal.css"

type Props = {
  onClose: () => void 
}

export function SpeedPresetModal(props: Props) {
  const [view, setView] = useStateView({speedPresets: true, speedBigStep: true, speedSmallStep: true, speedPresetRows: true, speedPresetPadding: true})
  if (!view) return null 


  const presets = view.speedPresets?.length === 12 ? view.speedPresets : getDefaultSpeedPresets()

  const handlePresetChange = (idx: number, newValue: number) => {
    setView({
      speedPresets: produce(presets, d => {
        d[idx] = newValue
      })
    })
  }

  const handleStepChange = (newValue: number, big?: boolean) => {
    setView({
      [big ? "speedBigStep" : "speedSmallStep"]: newValue
    })
  }

  return <ModalBase keepOnWheel={true} onClose={props.onClose}>
    <div className="SpeedPresetModal ModalMain">

      {/* Row selection */}
      <div className="field">
        <span>{gvar.gsm.token.rows}</span>
        <SegmentedButtons numbers={[1, 2, 3, 4]} value={view.speedPresetRows ?? 4} onChange={v => {
          setView({speedPresetRows: v})
        }}/>
      </div>

      {/* Size slider */}
      <div className="field">
        <span>{gvar.gsm.token.size}</span>
        <SliderMicro
          value={view.speedPresetPadding ?? 0} 
          onChange={v => {
            setView({speedPresetPadding: v ?? null})
          }}
          default={0}
          sliderMin={0}
          sliderMax={15}
          sliderStep={0.1}
        />
      </div>

      {/* Table */}
      <div className="presetControl" style={{
        "--padding": `${5 + (view.speedPresetPadding ?? 0)}px`
      } as CSSProperties}>

        {/* Cell inputs */}
        {presets.slice(0, clamp(1, 4, view.speedPresetRows ?? 4) * 3).map((v, i) => (
          <NumericInput className="preset" key={i} value={v} onChange={t => handlePresetChange(i, t)} min={0.07} max={16} noNull={true}/>
        ))}

        {/* Small increment */}
        <span>{">"}</span>
        <NumericInput className="wide" value={view.speedSmallStep || 0.01} onChange={t => handleStepChange(t, false)} min={0.001} noNull={false} placeholder={"0.01"}/>

        {/* Big increment */}
        <span>{">>"}</span>
        <NumericInput className="wide" value={view.speedBigStep || 0.1} onChange={t => handleStepChange(t, true)} min={0.001} noNull={false} placeholder={"0.1"}/>
      </div>

      {/* Reset */}
      <button onClick={e => {
        setView({speedPresetPadding: null, speedPresetRows: null, speedPresets: null, speedSmallStep: null, speedBigStep: null})
      }} className="reset">{gvar.gsm.token.reset}</button>
    </div>
  </ModalBase>
}