
import React from "react"
import { AudioFx } from "../types"
import { FaPowerOff } from "react-icons/fa"
import { getDefaultEq, EQ_PRESETS } from "../defaults"
import { GiAnticlockwiseRotation } from "react-icons/gi"
import { formatFreq } from "../utils/helper"
import { SliderMicro } from "../comps/SliderMicro"
import "./EqualizerControl.scss"
import produce from "immer"

type EqualizerControlProps = {
  value: AudioFx["eq"],
  onChange: (newEq: AudioFx["eq"]) => void 
}

export function EqualizerControl(props: EqualizerControlProps) {
  const eq = props.value

  const presets = (EQ_PRESETS as any)[eq.values.length.toString()] as typeof EQ_PRESETS["10"]

  return <div className="EqualizerControl audioTab">
    <div className="controls">
      <button className={eq.enabled ? "active" : "muted"} onClick={e => {
        props.onChange(produce(eq, d => {
          d.enabled = !d.enabled
        }))
      }}><FaPowerOff size={15}/></button>
      <button onClick={e => {
        props.onChange(produce(eq, d => {
         return getDefaultEq()
        }))
      }}><GiAnticlockwiseRotation size={15}/></button>
    </div>
    <div className="preset">
      <select value={eq.values.length.toString()} onChange={e => {
        const bandCount = parseInt(e.target.value)
        if (bandCount === eq.values.length) return 
        props.onChange(produce(eq, d => {
          d.values = Array(bandCount).fill(0)
          delete d.name
        }))
      }}>
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="30">30</option>
      </select>
      <select value={eq.name || ""} onChange={e => {
        if (e.target.value === "") {
          props.onChange(produce(eq, d => {
            delete d.name 
          }))
          return 
        }
        const target = presets?.find(v => v.name === e.target.value)
        if (!target) return 
        props.onChange(produce(eq, d => {
          d.enabled = true 
          d.name = target.name
          d.values = target.values
        }))
      }}>
        <option value="">{"---"}</option>
        {(presets ?? []).map(v => (
          <option key={v.name} value={v.name}>{v.name}</option>
        ))}
      </select>
    </div>
    <div className="values">
      <SliderMicro
        key="intensity"
        label={"POW"}
        value={eq.factor ?? 1}
        sliderMin={0}
        sliderMax={3}
        default={1}
        pass={{style: {marginBottom: "10px"}}}
        onChange={newValue => {
          props.onChange(produce(eq, d => {
            d.factor = newValue
            delete d.name
          }))
        }}
      />
      {eq.values.map((value, i) => {
        const freq = 31.25 * (2 ** (i / Math.round(eq.values.length / 10)))
        return (
          <SliderMicro
            key={freq.toString()}
            label={`${i === 0 ? "<" : (i === (eq.values.length -1) ? ">" : "")}${formatFreq(freq)}`}
            value={value}
            sliderMin={-20}
            sliderMax={20}
            sliderStep={0.1}
            min={-40}
            max={40}
            default={0}
            onChange={newValue => {
              props.onChange(produce(eq, d => {
                if (newValue !== 0) {
                  d.enabled = true 
                }
                d.values[i] = newValue
                delete d.name
              }))
            }}
          />
        )
      })}
    </div>
  </div>
}

