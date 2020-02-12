import React, { useState, useCallback, useContext, useRef } from "react"
import { setContext, flipFx, copyInto, resetFx, toggleFx, handleMove } from "../utils/configUtils"
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
    setContext(config, produce(ctx, d => {
      handleMove(backdrop ? "backdrop" : "element", filterName, d, down)
    }), tabId)
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
          setContext(config, produce(ctx, d => {
            toggleFx(backdropTab ? "backdrop" : "element", d)
          }), tabId)
        }}>enabled</button>
        <button onClick={e => {
          setContext(config, produce(ctx, d => {
            resetFx(backdropTab ? "backdrop" : "element", d)
          }), tabId)
        }}>reset</button>
        <button title="copy fx values from other tab." onClick={e => {
          setContext(config, produce(ctx, d => {
            copyInto(backdropTab, d)
          }), tabId)
        }}>copy into</button>
        <button title={"swap element and backdrop fx values"} onClick={e => {
          setContext(config, produce(ctx, d => {
            flipFx(d)
          }), tabId)
        }}>flip</button>
      </div>
      {!backdropTab && (
        <div className="query">
          <span>query <Tooltip tooltip="CSS selector used to find elements to filter. For basic usage, enter a comma separated list of tagNames you want to select. Eg. 'video, img' will query for both videos and images. For advanced usage, view documentation online about CSS selectors. Warning, generic selectors can cause performance problems."/></span>
          <ThrottledTextInput pass={{placeholder: "defaults to 'video'"}} value={ctx.elementQuery || ""} onChange={v => {
            setContext(config, produce(ctx, d => {
              d.elementQuery = v
            }), tabId)
          }}/>
        </div>
      )}
      {ctx[backdropTab ? "backdropFilterValues" : "elementFilterValues"].map(filterValue => (
        <FilterControl onMove={(name, down) => handleFilterMove(backdropTab, name, down)} key={filterValue.filter} filterValue={filterValue} onChange={newFilter => {
          setContext(config, produce(ctx, d => {
            let dFilterValues = d[backdropTab ? "backdropFilterValues" : "elementFilterValues"]
            const idx = dFilterValues.findIndex(v => v.filter === filterValue.filter)
            dFilterValues[idx] = newFilter
          }), tabId)
        }}/>
      ))}
    </div>
  )
}
