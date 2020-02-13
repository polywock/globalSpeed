import React, { useState, useContext } from "react"
import { flipFx, copyInto, resetFx, handleMove, persistConfig, getContext, setFx } from "../utils/configUtils"
import produce from "immer"
import { FilterName } from "../defaults/filters"
import { FilterControl } from "./FilterControl"
import { Tooltip } from "../comps/Tooltip"
import "./FxPanal.scss"
import { ConfigContext } from "../ConfigContext"
import { ThrottledTextInput } from "../comps/ThrottledTextInput"
import { isFirefox } from "../utils/helper"



export function FxPanal(props: {}) {
  const [backdropTab, setBackdropTab] = useState(false)
  const [expandWarning, setExpandWarning] = useState(false)
  const { config, tabId, ctx } = useContext(ConfigContext)



  const handleFilterMove = (backdrop: boolean, filterName: FilterName, down: boolean) => {
    persistConfig(produce(config, dConfig => {
      const dCtx = getContext(dConfig, tabId)
      handleMove(backdrop ? "backdrop" : "element", filterName, dCtx, down)
    }))
  }


  return (
    <div className="FxPanal">
      <div className="tabs">
        <button className={`${!backdropTab ? "active" : ""} ${ctx.elementFx ? "enabled" : ""}`} onClick={e => {
          setBackdropTab(false)
        }}>element</button>
        <button className={`${backdropTab ? "active" : ""} ${ctx.backdropFx ? "enabled" : ""}`} onClick={e => {
          setBackdropTab(true)
        }}>backdrop</button>
      </div>
      {(backdropTab && isFirefox()) && (
        <div onClick={e => {
          if ((e.target as HTMLElement).tagName?.toLowerCase() !== "code") {
            setExpandWarning(!expandWarning)
          }
        }} className="card red">
          {expandWarning ? (
            <span>For backdrop filters, Firefox users need to enable <code>gfx.webrender.all</code> and <code>layout.css.backdrop-filter.enabled</code> by going to the <code>about:page</code> url. Restart Firefox after enabling the two flags.</span>
          ) : <span>Warning, click me...</span>}
        </div>
      )}
      <div className="controls">
        <button className={(backdropTab && ctx.backdropFx) || (!backdropTab && ctx.elementFx) ? "blue" : ""} onClick={e => {
          persistConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            setFx(backdropTab ? "backdrop" : "element", "toggle", dCtx) 
          }))
        }}>enabled</button>
        <button onClick={e => {
          persistConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            resetFx(backdropTab ? "backdrop" : "element", dCtx) 
          }))
        }}>reset</button>
        <button title="copy fx values from other tab." onClick={e => {
          persistConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            copyInto(backdropTab, dCtx)
          }))
        }}>copy into</button>
        <button title={"swap element and backdrop fx values"} onClick={e => {
          persistConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            flipFx(dCtx)
          }))
        }}>flip</button>
      </div>
      {!backdropTab && (
        <div className="query">
          <span>query <Tooltip tooltip="CSS selector used to find elements to filter. For basic usage, enter a comma separated list of tagNames you want to select. Eg. 'video, img' will query for both videos and images. For advanced usage, view documentation online about CSS selectors. Warning, generic selectors can cause performance problems."/></span>
          <ThrottledTextInput pass={{placeholder: "defaults to 'video'"}} value={ctx.elementQuery || ""} onChange={v => {
            persistConfig(produce(config, dConfig => {
              const dCtx = getContext(dConfig, tabId)
              dCtx.elementQuery = v
            }))
          }}/>
        </div>
      )}
      {ctx[backdropTab ? "backdropFilterValues" : "elementFilterValues"].map(filterValue => (
        <FilterControl onMove={(name, down) => handleFilterMove(backdropTab, name, down)} key={filterValue.filter} filterValue={filterValue} onChange={newFilter => {
          persistConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            let dFilterValues = dCtx[backdropTab ? "backdropFilterValues" : "elementFilterValues"]
            const idx = dFilterValues.findIndex(v => v.filter === filterValue.filter)
            dFilterValues[idx] = newFilter
          }))
        }}/>
      ))}
    </div>
  )
}
