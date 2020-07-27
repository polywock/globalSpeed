
import React from "react"
import { AudioFx } from "../types"
import { FaPowerOff } from "react-icons/fa"
import { getDefaultComp, COMP_PRESETS } from "../defaults"
import { GiAnticlockwiseRotation } from "react-icons/gi"
import { SliderPlus } from "../comps/SliderPlus"
import produce from "immer"

type CompressorControlProps = {
  value: AudioFx["comp"],
  onChange: (newComp: AudioFx["comp"]) => void 
}

export function CompressorControl(props: CompressorControlProps) {
  const comp = props.value

  return <div className="CompressorControl audioTab">
    <div className="controls">
      <button className={comp.enabled ? "active" : "muted"} onClick={e => {
        props.onChange(produce(comp, d => {
          d.enabled = !d.enabled
        }))
      }}><FaPowerOff size={15}/></button>
      <button onClick={e => {
        props.onChange(produce(comp, d => {
         return getDefaultComp()
        }))
      }}><GiAnticlockwiseRotation size={15}/></button>
    </div>
    <select style={{marginTop: "15px", display: "block"}} value={comp.name || ""} onChange={e => {
      const preset = COMP_PRESETS.find(v => v.name === e.target.value)
      if (!preset) return 
      props.onChange(produce(comp, d => {
        return preset 
      }))
    }}>
      <option value={""}>{"---"}</option>
      {COMP_PRESETS.map(v => (
        <option key={v.name} value={v.name}>{v.name}</option>
      ))}
    </select>
    <div className="values">
      <SliderPlus
        label="threshold"
        value={comp.threshold}
        sliderMin={-100}
        sliderMax={0}
        sliderStep={1}
        min={-100}
        max={0}
        default={-24}
        onChange={newValue => {
          props.onChange(produce(comp, d => {
            d.threshold = newValue
            delete d.name
          }))
        }}
      />
      <SliderPlus
        label="knee"
        value={comp.knee}
        sliderMin={0}
        sliderMax={40}
        sliderStep={0.5}
        min={0}
        max={40}
        default={30}
        onChange={newValue => {
          props.onChange(produce(comp, d => {
            d.knee = newValue
            delete d.name
          }))
        }}
      />
      <SliderPlus
        label="ratio"
        value={comp.ratio}
        sliderMin={1}
        sliderMax={20}
        sliderStep={0.1}
        min={1}
        max={20}
        default={12}
        onChange={newValue => {
          props.onChange(produce(comp, d => {
            d.ratio = newValue
            delete d.name
          }))
        }}
      />
      <SliderPlus
        label="attack"
        value={comp.attack}
        sliderMin={0}
        sliderMax={1}
        sliderStep={0.01}
        min={0}
        max={1}
        default={0.003}
        onChange={newValue => {
          props.onChange(produce(comp, d => {
            d.attack = newValue
            delete d.name
          }))
        }}
      />
      <SliderPlus
        label="release"
        value={comp.release}
        sliderMin={0}
        sliderMax={1}
        sliderStep={0.01}
        min={0}
        max={1}
        default={0.25}
        onChange={newValue => {
          props.onChange(produce(comp, d => {
            d.release = newValue
            delete d.name
          }))
        }}
      />
      <SliderPlus
        label="gain"
        value={comp.gain}
        sliderMin={0}
        sliderMax={3}
        sliderStep={0.01}
        min={0}
        default={1}
        onChange={newValue => {
          props.onChange(produce(comp, d => {
            d.gain = newValue
            delete d.name
          }))
        }}
      />
    </div>
  </div>
}