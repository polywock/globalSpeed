import { useState, useMemo } from "react"
import { checkFilterDeviation, sendMessageToConfigSync, formatFilters } from "../utils/configUtils"
import { Tooltip } from "../comps/Tooltip"
import { ThrottledTextInput } from "../comps/ThrottledTextInput"
import { Filters } from "./Filters"
import { Origin } from "./Origin"
import { GiAnticlockwiseRotation } from "react-icons/gi"
import { FaPowerOff, FaExchangeAlt } from "react-icons/fa"
import { DropdownWarning } from "../comps/DropdownWarning"
import { getDefaultFx } from "../defaults"
import { Fx } from "../types"
import "./FxControl.scss"
import produce from "immer"

const SUPPORTS_BACKDROP = window.CSS.supports("backdrop-filter: invert(1)")

type FxControlProps = {
  live?: boolean,
  elementFx: Fx,
  backdropFx: Fx,
  enabled: boolean,
  handleFxChange: (backdrop: boolean, newFx: Fx) => void,
  swapFx: () => void,
  className?: string
}

export function FxControl(props: FxControlProps) {
  const { elementFx, backdropFx } = props 
  const [backdropTab, setBackdropTab] = useState(false)
  const [transformTab, setTransformTab] = useState(false)

  const fx = backdropTab ? backdropFx : elementFx

  const active = useMemo(() => ({
    elemFilter:  checkFilterDeviation(elementFx.filters),
    elemTransform: checkFilterDeviation(elementFx.transforms),
    backdropFilter: checkFilterDeviation(backdropFx.filters),
    backdropTransform: checkFilterDeviation(backdropFx.transforms)
  }), [elementFx, backdropFx]) 

  return (
    <div className={`FxControl ${props.className || ""}`}>
      <div className="tabs">
        <button className={`${!backdropTab ? "open" : ""} ${(active.elemFilter || active.elemTransform) ? "active" : ""}`} onClick={e => {
          setBackdropTab(false)
        }}>{window.gsm.token.element}</button>
        <button className={`${backdropTab ? "open" : ""} ${(active.backdropFilter || active.backdropTransform)  ? "active" : ""}`} onClick={e => {
          setBackdropTab(true)
        }}>{window.gsm.token.backdrop}</button>
      </div>
      {backdropTab && !SUPPORTS_BACKDROP && (
        <DropdownWarning value={window.gsm.warnings.backdropFirefox}/>
      )}
      <div className="controls">
        <button className={fx.enabled ? "active" : "muted"} onClick={e => {
          if (backdropTab) {
            props.handleFxChange(true, {...backdropFx, enabled: !backdropFx.enabled})
          } else {
            props.handleFxChange(false, {...elementFx, enabled: !elementFx.enabled})
          }
        }}><FaPowerOff size={15}/></button>
        <button onClick={e => {
          props.swapFx()
        }}><FaExchangeAlt size={15}/></button>
        <button onClick={e => {
          if (backdropTab) {
            props.handleFxChange(true, getDefaultFx())
          } else {
            props.handleFxChange(false, getDefaultFx())
          }
        }}><GiAnticlockwiseRotation size={15}/></button>
      </div>
      {!backdropTab && (
        <div className="query">
          <span>{window.gsm.token.query} <Tooltip tooltip={window.gsm.fxPanel.queryTooltip}/></span>
          <ThrottledTextInput passInput={{placeholder: `video`}} value={fx.query || ""} onChange={v => {
            props.handleFxChange(false, produce(elementFx, d => {
              d.query = v 
            }))
          }}/>
        </div>
      )}
      <div className="tabs">
        <button className={`${!transformTab ? "open" : ""} ${(backdropTab ? active.backdropFilter : active.elemFilter) ? "active" : ""}`} onClick={e => {
          setTransformTab(false)
        }}>{window.gsm.token.filters}</button>
        <button className={`${transformTab ? "open" : ""} ${(backdropTab ? active.backdropTransform : active.elemTransform)  ? "active" : ""}`} onClick={e => {
          setTransformTab(true)
        }}>{window.gsm.token.transforms}</button>
      </div>
      {transformTab && (
        <Origin x={fx.originX || "center"} y={fx.originY || (backdropTab ? "top" : "center")} onChange={(x, y) => {
          props.handleFxChange(backdropTab, produce(backdropTab ? backdropFx : elementFx, d => {
            d.originX = x
            d.originY = y
          }))
        }}/>
      )}
      {(props.live && !transformTab) && (
        <button className="intoPane" disabled={!fx.enabled || !(backdropTab ? active.backdropFilter : active.elemFilter)} onClick={e => {
          const filter = formatFilters(fx.filters)
          if (!filter) return 
          props.handleFxChange(backdropTab, produce(fx, d => {
            d.filters = getDefaultFx().filters
          }))
          sendMessageToConfigSync({type: "ADD_PANE", filter}, window.tabInfo.tabId, 0)
          setTimeout(() => {
            window.close()
          }, 50)
        }}>{window.gsm.fxPanel.intoPane}</button>
      )}
      <Filters filters={transformTab ? fx.transforms : fx.filters} onChange={newFilters => {
        props.handleFxChange(backdropTab, produce(backdropTab ? backdropFx : elementFx, d => {
          d[transformTab ? "transforms" : "filters"] = newFilters
          if (checkFilterDeviation(transformTab ? d.transforms : d.filters)) {
            d.enabled = true 
          }
        }))
      }}/>
    </div>
  )
}
