import React, { useEffect, useState, useCallback, useMemo } from "react"
import { getConfigOrDefault, getContext, conformSpeed, persistConfig, getPin } from "../utils/configUtils"
import { getActiveTabId } from "../utils/browserUtils"
import { Config} from "../types"
import { SpeedControl } from "./SpeedControl"
import produce from "immer"
import { FxPanal } from "./FxPanal"
import { Header } from "./Header"
import "./App.scss"
import { NumericInput } from "../comps/NumericInput"


export function App(props: {}) {
  const [config, setConfig] = useState(null as Config)
  const [tabId, setTabId] = useState(null as number)
  const [fxPanal, setFxPanal] = useState(false)
  const ref = useMemo(() => ({} as any), [])

  useEffect(() => {
    getConfigOrDefault().then(config => {
      setConfig(config)
    })
    
    getActiveTabId().then(tabId => {
      setTabId(tabId)
    })

    chrome.storage.onChanged.addListener(changes => {
      if (new Date().getTime() - ref.lastGuidedPersist < 500) return 
      const newConfig = changes?.config?.newValue
      if (!newConfig) return 
      setConfig(newConfig)
    })
  }, [])

  const setAndPersistConfig = useCallback((config: Config) => {
    setConfig(config)
    ref.lastGuidedPersist = new Date().getTime()
    persistConfig(config)
  }, [])
  
  if (!config || tabId == null){
    return <div>Loading...</div>
  }

  const pin = getPin(config, tabId)
  const ctx = getContext(config, tabId)

  return (
    <div id="App">
      <Header fxPanal={fxPanal} setFxPanal={setFxPanal} config={config} tabId={tabId} setConfig={setAndPersistConfig}/>
      {fxPanal ? (
        <FxPanal config={config} tabId={tabId} setConfig={setAndPersistConfig}/>
      ) : (
        <div className="mainPanal">
          <SpeedControl speed={ctx.speed} onChange={v => {
            setAndPersistConfig(produce(config, d => {
              const ctx = getContext(d, tabId)
              ctx.speed = conformSpeed(v)
            }))
          }}/>
          {pin && ctx.volume != null && (
            <div className="volume">
              <NumericInput noNull={true} min={0} value={ctx.volume} onChange={v => {
                 setAndPersistConfig(produce(config, d => {
                  const dCtx = getContext(d, tabId)
                  dCtx.volume = v
                }))
              }}/>
              <input step={0.05} type="range" min={0} max={4} value={ctx.volume} onChange={e => {
                setAndPersistConfig(produce(config, d => {
                  const dCtx = getContext(d, tabId)
                  dCtx.volume = e.target.valueAsNumber
                }))
              }}/>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
