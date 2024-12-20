import { produce } from "immer"
import { ModalBase } from "../comps/ModalBase"
import { SliderMicro } from "src/comps/SliderMicro"
import { useStateView } from "../hooks/useStateView"
import { Reset } from "src/comps/Reset"
import { Keybind } from "src/types"
import { NumericInput } from "src/comps/NumericInput"
import "./CinemaModal.css"

type Props = {
  value: Keybind,
  onChange: (id: string, newKb: Keybind) => void,
  onClose: () => void 
}

export function CinemaModal(props: Props) {
  const [view, setView] = useStateView({circleInit: true})
  if (!view) return null 
  let value = props.value || {} as Keybind


  return <ModalBase keepOnWheel={true} onClose={props.onClose}>
    <div className="CinemaModal ModalMain">

     
      {/* Color */}
      <div className="field">
        <span>{gvar.gsm.token.color}</span>
        <div className="fieldValue mxmx">
          <input type="color" value={value.valueString || "#000000"} onChange={e => {
            props.onChange(value.id, produce(value, d => {
              d.valueString = e.target.value || null 
            }))
          }}/>
          <Reset onClick={() => {
            props.onChange(value.id, produce(value, d => {
              delete d.valueString
            }))
          }} active={!!value.valueString}/>
        </div>
      </div>


      {/* Opacity */}
      <div className="field">
        <span>{gvar.gsm.filter.opacity}</span>
        <div className="fieldValue">
          <SliderMicro
            value={value.valueNumber ?? 90} 
            onChange={v => {
              props.onChange(value.id, produce(value, d => {
                d.valueNumber = v
              }))
            }}
            default={90}
            sliderMin={5}
            sliderMax={100}
            sliderStep={1}
          />
        </div>
      </div>

      {/* Rounding */}
      <div className="field">
        <span>{gvar.gsm.token.rounding}</span>
        <div className="fieldValue">
          <NumericInput
            value={value.valueNumberAlt} 
            onChange={v => {
              props.onChange(value.id, produce(value, d => {
                d.valueNumberAlt = v
              }))
            }}
            min={0}
            placeholder={`${value.valueNumberAlt ?? 10}`}
          />
        </div>
      </div>

      {/* Reset */}
      <button onClick={e => {
        props.onChange(value.id, produce(value, d => {
          delete d.valueString
          delete d.valueNumber 
          delete d.valueNumberAlt
        }))
      }} className="reset">{gvar.gsm.token.reset}</button>
    </div>
  </ModalBase>
}