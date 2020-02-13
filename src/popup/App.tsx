import React, { useEffect, useState, useCallback } from "react"
import { getConfigOrDefault, getPin, getContext, conformSpeed, persistConfig } from "../utils/configUtils"
import { getActiveTabId } from "../utils/browserUtils"
import { Config} from "../types"
import { SpeedControl } from "./SpeedControl"
import produce from "immer"
import "./App.scss"
import { FxPanal } from "./FxPanal"
import { ConfigContext } from "../ConfigContext"
import { Header } from "./Header"



export function App(props: {}) {
  const [config, setConfig] = useState(null as Config)
  const [tabId, setTabId] = useState(null as number)

  const handleStorageChange = useCallback(async () => {
    const config = await getConfigOrDefault()
    setConfig(config);
  }, [])

  
  useEffect(() => {
    chrome.storage.onChanged.addListener(handleStorageChange)
    handleStorageChange()
    
    getActiveTabId().then(tabId => {
      setTabId(tabId)
    })
  }, [])
 
  
  if (!config || tabId == null){
    return <div>Loading...</div>
  }

  const pin = getPin(config, tabId)
  const ctx = getContext(config, tabId)


  return (
    <div id="App">
      <ConfigContext.Provider value={{config, tabId, pin, ctx}}>
        <Header/>
        {config.fxPanal ? (
          <FxPanal/>
        ) : (
          <SpeedControl speed={ctx.speed} onChange={v => {
            persistConfig(produce(config, d => {
              const ctx = getContext(d, tabId)
              ctx.speed = conformSpeed(v)
            }))
          }}/>
        )}
      </ConfigContext.Provider>
    </div>
  )
}
