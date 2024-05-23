import { produce } from "immer"
import { ModalBase } from "../comps/ModalBase"
import { IndicatorInit, StateView } from "../types"
import { INDICATOR_INIT } from "../defaults"
import { SetView } from "src/hooks/useStateView"
import { Reset } from "src/comps/Reset"
import { SliderMicro } from "src/comps/SliderMicro"
import "./IndicatorModal.css"
import { Indicator } from "src/contentScript/isolated/utils/Indicator"

type Props = {
  view: StateView, 
  setView: SetView
  onClose: () => void 
}

export function IndicatorModal(props: Props) {
  const { view, setView } = props 
  const init = view.indicatorInit || {}


  return <ModalBase keepOnWheel={true} onClose={props.onClose}>
    <div className="IndicatorModal ModalMain">

      {/* Position */}
      <div className="field">
        <span>{gvar.gsm.token.position}</span>
        <div>
          <select className="padded" style={{marginRight: '10px'}} value={init?.position ?? "TL"} onChange={e => {
            const indicatorInit = produce(init ?? {}, d => {
              d.position = e.target.value as any
            })
            showIndicator(indicatorInit)
            setView({indicatorInit})
          }}>
            <option value="TL">{gvar.gsm.token.topLeft}</option>
            <option value="TR">{gvar.gsm.token.topRight}</option>
            <option value="BL">{gvar.gsm.token.bottomLeft}</option>
            <option value="BR">{gvar.gsm.token.bottomRight}</option>
            <option value="C">{gvar.gsm.token.center}</option>
          </select>
          <Reset onClick={() => {
            const indicatorInit = produce(init ?? {}, d => {
              delete d.position
            })
            showIndicator(indicatorInit)
            setView({indicatorInit})
          }} active={(init?.position || "TL") !== "TL"}/>
        </div>
      </div>
      

      {/* Color */}
      <div className="field">
        <span>{gvar.gsm.token.color}</span>
        <div className="colorControl">
          <input type="color" value={init?.backgroundColor || INDICATOR_INIT.backgroundColor} onChange={e => {
            const indicatorInit = produce(init ?? {}, d => {
              d.backgroundColor = e.target.value
            })
            showIndicator(indicatorInit)
            setView({indicatorInit})
          }}/>
          <input type="color" value={init?.textColor || INDICATOR_INIT.textColor} onChange={e => {
            const indicatorInit = produce(init ?? {}, d => {
              d.textColor = e.target.value
            })
            showIndicator(indicatorInit)
            setView({indicatorInit})
          }}/>
          <Reset onClick={() => {
            const indicatorInit = produce(init ?? {}, d => {
              d.textColor = null 
              d.backgroundColor = null
            })
            showIndicator(indicatorInit)
            setView({indicatorInit})
          }} active={
            ((init?.textColor || INDICATOR_INIT.textColor) !== INDICATOR_INIT.textColor) ||
            ((init?.backgroundColor || INDICATOR_INIT.backgroundColor) !== INDICATOR_INIT.backgroundColor)
          }/>
        </div>
      </div>

      {/* Size */}
      <div className="field">
        <span>{gvar.gsm.token.size}</span>
        <SliderMicro
          value={init?.scaling ?? INDICATOR_INIT.scaling} 
          onChange={v => {
            const indicatorInit = produce(init ?? {}, d => {
              d.scaling = v
            })
            showIndicator(indicatorInit)
            setView({indicatorInit})
          }}
          default={INDICATOR_INIT.scaling}
          sliderMin={0.75}
          sliderMax={1.5}
          sliderStep={0.01}
        />
      </div>

      {/* Rounding */}
      <div className="field">
        <span>{gvar.gsm.token.rounding}</span>
        <SliderMicro 
          value={init?.rounding ?? INDICATOR_INIT.rounding} 
          onChange={v => {
            const indicatorInit = produce(init ?? {}, d => {
              d.rounding = v
            })
            showIndicator(indicatorInit)
            setView({indicatorInit})
          }}
          default={INDICATOR_INIT.rounding}
          sliderMin={0}
          sliderMax={4}
          sliderStep={0.01}
        />
      </div>

      {/* Offset */}
      {init?.position !== 'C' && (
        <div className="field">
          <span>{gvar.gsm.token.offset}</span>
          <SliderMicro 
            value={init?.offset ?? INDICATOR_INIT.offset} 
            onChange={v => {
              const indicatorInit = produce(init ?? {}, d => {
                d.offset = v
              })
              showIndicator(indicatorInit)
              setView({indicatorInit})
            }}
            default={INDICATOR_INIT.offset}
            sliderMin={0}
            sliderMax={4}
            sliderStep={0.01}
          />
        </div>
      )}

      {/* Animation */}
      <div className="field">
        <span>{gvar.gsm.token.animation}</span>
        <div>
          <select className="padded" style={{marginRight: '10px'}} value={init?.animation || 1} onChange={e => {
            const indicatorInit = produce(init ?? {}, d => {
              d.animation = parseInt(e.target.value) as any
            })
            showIndicator(indicatorInit, true)
            setView({indicatorInit})
          }}>
            <option value="1">{gvar.gsm.token.default}</option>
            <option value="2">{gvar.gsm.token.static}</option>
            <option value="3">{gvar.gsm.token.shrink}</option>
            <option value="4">{gvar.gsm.token.implode}</option>
            <option value="5">{gvar.gsm.token.rotate}</option>
          </select>
          <Reset onClick={() => {
            const indicatorInit = produce(init ?? {}, d => {
              delete d.animation
            })
            showIndicator(indicatorInit, true)
            setView({indicatorInit})
          }} active={(init?.animation || 1) !== 1}/>
        </div>
      </div>

      {/* Duration */}
      <div className="field">
        <span>{gvar.gsm.token.duration}</span>
        <div className="col" style={{gridColumnGap: "10px"}}>
          <SliderMicro 
            value={init?.duration ?? INDICATOR_INIT.duration} 
            onChange={v => {
              const indicatorInit = produce(init ?? {}, d => {
                d.duration = v
              })
              setView({indicatorInit})
            }}
            default={INDICATOR_INIT.duration}
            sliderMin={0.1}
            sliderMax={1.9}
            sliderStep={0.01}
            pass={{onMouseUp: v => showIndicator(init, true)}}
          />
        </div>
      </div>

      {/* Reset */}
      <button onClick={e => {
        setView({indicatorInit: null})
      }} className="reset">{gvar.gsm.token.reset}</button>
    </div>
  </ModalBase>
}


function showIndicator(init: IndicatorInit, realDuration?: boolean) {
  gvar.indicator = gvar.indicator || new Indicator()
  gvar.indicator.setInit({...init, 
      duration: realDuration ? init?.duration : 3, 
      animation: realDuration ? init?.animation : 2
  })
  gvar.indicator.show({text: "1.00"})
}