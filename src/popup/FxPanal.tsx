import React, { useState } from "react"
import { flipFx, copyInto, resetFx, moveFilter, getContext, setFx, autoFxState } from "../utils/configUtils"
import produce from "immer"
import { FilterName } from "../defaults/filters"
import { FilterControl } from "./FilterControl"
import { Tooltip } from "../comps/Tooltip"
import { ThrottledTextInput } from "../comps/ThrottledTextInput"
import { isFirefox } from "../utils/helper"
import { Config } from "../types"
import "./FxPanal.scss"


type FxPanalProps = {
  config?: Config,
  tabId?: number,
  setConfig: (newConfig: Config) => void 
}

export function FxPanal(props: FxPanalProps) {
  const [backdropTab, setBackdropTab] = useState(false)
  const [expandWarning, setExpandWarning] = useState(false)
  const { config, tabId, setConfig } = props

  const ctx = getContext(config, tabId)



  const handleFilterMove = (backdrop: boolean, filterName: FilterName, down: boolean) => {
    setConfig(produce(config, dConfig => {
      const dCtx = getContext(dConfig, tabId)
      moveFilter(backdrop ? "backdrop" : "element", filterName, dCtx, down)
    }))
  }


  return (
    <div className="FxPanal">
      <div className="tabs">
        <button className={`${!backdropTab ? "active" : ""} ${ctx.elementFx ? "enabled" : ""}`} onClick={e => {
          setBackdropTab(false)
        }}>{window.gsm["token_element"] || ""}</button>
        <button className={`${backdropTab ? "active" : ""} ${ctx.backdropFx ? "enabled" : ""}`} onClick={e => {
          setBackdropTab(true)
        }}>{window.gsm["token_backdrop"] || ""}</button>
      </div>
      {(backdropTab && isFirefox()) && (
        <div onClick={e => {
          if ((e.target as HTMLElement).tagName?.toLowerCase() !== "code") {
            setExpandWarning(!expandWarning)
          }
        }} className="card red">
          {expandWarning ? (
            <span>{window.gsm["firefoxBackdropWarning"] || ""}</span>
          ) : <span>Warning, click me...</span>}
        </div>
      )}
      <div className="controls">
        <button className={(backdropTab && ctx.backdropFx) || (!backdropTab && ctx.elementFx) ? "blue" : ""} onClick={e => {
          setConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            setFx(backdropTab ? "backdrop" : "element", "toggle", dCtx) 
          }))
        }}>{window.gsm["token_enabled"] || ""}</button>
        <button onClick={e => {
          setConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            resetFx(backdropTab ? "backdrop" : "element", dCtx) 
          }))
        }}>{window.gsm["token_reset"] || ""}</button>
        <button title={window.gsm["fxPanal_copyIntoTooltip"] || ""} onClick={e => {
          setConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            copyInto(backdropTab, dCtx)
          }))
        }}>{window.gsm["token_copyInto"] || ""}</button>
        <button title={window.gsm["fxPanal_swapTooltip"] || ""} onClick={e => {
          setConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            flipFx(dCtx)
          }))
        }}>{window.gsm["token_swap"] || ""}</button>
        {!backdropTab && (
          <>
            <button style={{marginTop: "10px"}} className={ctx.elementFlipX ? "blue" : ""} onClick={e => {
              setConfig(produce(config, dConfig => {
                const dCtx = getContext(dConfig, tabId)
                dCtx.elementFlipX = !dCtx.elementFlipX
                autoFxState(dCtx, backdropTab)
              }))
            }}>{window.gsm["token_flipX"] || ""}</button>
            <button style={{marginTop: "10px"}} className={ctx.elementFlipY ? "blue" : ""} onClick={e => {
              setConfig(produce(config, dConfig => {
                const dCtx = getContext(dConfig, tabId)
                dCtx.elementFlipY = !dCtx.elementFlipY
                autoFxState(dCtx, backdropTab)
              }))
            }}>{window.gsm["token_flipY"] || ""}</button>
          </>
        )}
        {backdropTab && (
          <button style={{marginTop: "10px"}} className={ctx.backdropFlipX ? "blue" : ""} onClick={e => {
            setConfig(produce(config, dConfig => {
              const dCtx = getContext(dConfig, tabId)
              dCtx.backdropFlipX = !dCtx.backdropFlipX
              autoFxState(dCtx, backdropTab)
            }))
          }}>{window.gsm["token_flipX"] || ""}</button>
        )}
      </div>
      {!backdropTab && (
        <div className="query">
          <span>{window.gsm["token_query"] || ""} <Tooltip tooltip={window.gsm["fxPanal_queryTooltip"] || ""}/></span>
          <ThrottledTextInput pass={{placeholder: `${window.gsm["token_default"] || ""} 'video'`}} value={ctx.elementQuery || ""} onChange={v => {
            setConfig(produce(config, dConfig => {
              const dCtx = getContext(dConfig, tabId)
              dCtx.elementQuery = v
            }))
          }}/>
        </div>
      )}
      {ctx[backdropTab ? "backdropFilterValues" : "elementFilterValues"].map(filterValue => (
        <FilterControl onMove={(name, down) => handleFilterMove(backdropTab, name, down)} key={filterValue.filter} filterValue={filterValue} onChange={newFilter => {
          setConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            let dFilterValues = dCtx[backdropTab ? "backdropFilterValues" : "elementFilterValues"]
            const idx = dFilterValues.findIndex(v => v.filter === filterValue.filter)
            dFilterValues[idx] = newFilter
            autoFxState(dCtx, backdropTab)
          }))
        }}/>
      ))}
    </div>
  )
}
