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
        }}>{chrome.i18n.getMessage("fxPanal__elementTab")}</button>
        <button className={`${backdropTab ? "active" : ""} ${ctx.backdropFx ? "enabled" : ""}`} onClick={e => {
          setBackdropTab(true)
        }}>{chrome.i18n.getMessage("fxPanal__backdropTab")}</button>
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
          setConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            setFx(backdropTab ? "backdrop" : "element", "toggle", dCtx) 
          }))
        }}>{chrome.i18n.getMessage("fxPanal__enabledButton")}</button>
        <button onClick={e => {
          setConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            resetFx(backdropTab ? "backdrop" : "element", dCtx) 
          }))
        }}>{chrome.i18n.getMessage("fxPanal__resetButton")}</button>
        <button title={chrome.i18n.getMessage("fxPanal__copyIntoButtonTooltip")} onClick={e => {
          setConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            copyInto(backdropTab, dCtx)
          }))
        }}>{chrome.i18n.getMessage("fxPanal__copyIntoButton")}</button>
        <button title={chrome.i18n.getMessage("fxPanal__swapButtonTooltip")} onClick={e => {
          setConfig(produce(config, dConfig => {
            const dCtx = getContext(dConfig, tabId)
            flipFx(dCtx)
          }))
        }}>{chrome.i18n.getMessage("fxPanal__swapButton")}</button>
        {!backdropTab && (
          <>
            <button style={{marginTop: "10px"}} className={ctx.elementFlipX ? "blue" : ""} onClick={e => {
              setConfig(produce(config, dConfig => {
                const dCtx = getContext(dConfig, tabId)
                dCtx.elementFlipX = !dCtx.elementFlipX
                autoFxState(dCtx, backdropTab)
              }))
            }}>{chrome.i18n.getMessage("fxPanal__flipXButton")}</button>
            <button style={{marginTop: "10px"}} className={ctx.elementFlipY ? "blue" : ""} onClick={e => {
              setConfig(produce(config, dConfig => {
                const dCtx = getContext(dConfig, tabId)
                dCtx.elementFlipY = !dCtx.elementFlipY
                autoFxState(dCtx, backdropTab)
              }))
            }}>{chrome.i18n.getMessage("fxPanal__flipYButton")}</button>
          </>
        )}
        {backdropTab && (
          <button style={{marginTop: "10px"}} className={ctx.backdropFlipX ? "blue" : ""} onClick={e => {
            setConfig(produce(config, dConfig => {
              const dCtx = getContext(dConfig, tabId)
              dCtx.backdropFlipX = !dCtx.backdropFlipX
              autoFxState(dCtx, backdropTab)
            }))
          }}>{chrome.i18n.getMessage("fxPanal__flipXButton")}</button>
        )}
      </div>
      {!backdropTab && (
        <div className="query">
          <span>{chrome.i18n.getMessage("fxPanal__queryLabel")} <Tooltip tooltip={chrome.i18n.getMessage("fxPanal__queryLabelTooltip")}/></span>
          <ThrottledTextInput pass={{placeholder: `${chrome.i18n.getMessage("common__default")} 'video'`}} value={ctx.elementQuery || ""} onChange={v => {
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
