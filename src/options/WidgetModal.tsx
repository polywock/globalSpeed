import { produce } from "immer"
import { ModalBase } from "../comps/ModalBase"
import { SliderMicro } from "src/comps/SliderMicro"
import { useStateView } from "../hooks/useStateView"
import { Tooltip } from "src/comps/Tooltip"
import { Toggle } from "src/comps/Toggle"
import "./WidgetModal.css"
import { NumericInput } from "src/comps/NumericInput"
import { MAX_SPEED_CHROMIUM, MIN_SPEED_CHROMIUM } from "src/defaults/constants"

type Props = {
  onClose: () => void 
}

export function WidgetModal(props: Props) {
  const [view, setView] = useStateView({circleWidgetIcon: true, circleInit: true})
  if (!view) return null 
  let init = view.circleInit || {}


  return <ModalBase keepOnWheel={true} onClose={props.onClose}>
    <div className="WidgetModal ModalMain">

     
      {/* Header icon */}
      <div className="field">
        <div className="labelWithTooltip">
          <span>{gvar.gsm.options.flags.widget.showIcon}</span>
          <Tooltip tooltip={gvar.gsm.options.flags.widget.showIconTooltip}/>
        </div>
        <Toggle value={!!view.circleWidgetIcon} onChange={e => {
            setView({circleWidgetIcon: !view.circleWidgetIcon})
          }}/>
      </div>


      {/* Size */}
      <div className="field">
        <span>{gvar.gsm.token.size}</span>
        <SliderMicro
          value={init.circleSize ?? 45} 
          onChange={v => {
            setView({circleInit: produce(init, d => {
              d.circleSize = v
            })})
          }}
          default={45}
          sliderMin={5}
          sliderMax={140}
          sliderStep={1}
        />
      </div>

      {/* Size */}
      <div className="field">
        <span>{gvar.gsm.filter.opacity}</span>
        <SliderMicro
          value={init.opacity ?? 0.5} 
          onChange={v => {
            setView({circleInit: produce(init, d => {
              d.opacity = v
            })})
          }}
          default={0.5}
          sliderMin={0.1}
          sliderMax={0.6}
          sliderStep={0.01}
        />
      </div>

      {/* Auto hide */}
      <div className="field">
        <span>{gvar.gsm.options.flags.widget.autoHide}</span>
        <Toggle value={!init.autoHideDisabled} onChange={e => {
            setView({circleInit: produce(init, d => {
              d.autoHideDisabled = !d.autoHideDisabled
            })})
          }}/>
      </div>

      {/* Fullscreen only */}
      <div className="field">
        <div className="labelWithTooltip">
          <span>{gvar.gsm.options.flags.widget.fullscreenOnly}</span>
          <Tooltip tooltip={gvar.gsm.options.flags.widget.fullscreenOnlyTooltip}/>
        </div>
        <Toggle value={init.fullscreenOnly} onChange={e => {
            setView({circleInit: produce(init, d => {
              d.fullscreenOnly = !d.fullscreenOnly
            })})
          }}/>
      </div>

      {/* Press action */}
      <div className="field">
        <span>{gvar.gsm.options.flags.widget.pressAction}</span>
        <select value={init.mainAction || "SPEED"} onChange={e => {
          setView({circleInit: produce(init, d => {
            d.mainAction = e.target.value as any 
          })})
        }}>
          <option value="SPEED">{gvar.gsm.command.toggleSpeed}</option>
          <option value="PAUSE">{gvar.gsm.options.flags.widget.togglePause}</option>
        </select>
      </div>

      {/* Speed  */}
      {((init.mainAction || "SPEED" )=== "SPEED") && (
        <div className="field">
          <span>{gvar.gsm.command.speed}</span>
          <NumericInput rounding={2} noNull={true} min={MIN_SPEED_CHROMIUM} max={MAX_SPEED_CHROMIUM} value={init.mainActionSpeed ?? 3} onChange={v => {
            setView({circleInit: produce(init, d => {
              d.mainActionSpeed = v 
            })})
          }}/>
        </div>
      )}

      {/* Reset */}
      <button onClick={e => {
        setView({circleWidgetIcon: null, circleInit: null})
      }} className="reset">{gvar.gsm.token.reset}</button>
    </div>
  </ModalBase>
}