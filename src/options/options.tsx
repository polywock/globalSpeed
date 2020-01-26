import "regenerator-runtime/runtime"
import React, { useState, useEffect, useCallback } from "react"
import ReactDOM from "react-dom"
import { KeyPicker } from "../comps/KeyPicker"
import { NumericInput } from "../comps/NumericInput"
import "./options.scss"
import { Config } from "../types"
import { getConfigOrDefault, persistConfig } from "../utils"
import produce from "immer"

function Options(props: {}) {
  const [config, setConfig] = useState(null as Config)

  const handleStorageChange = useCallback(async () => {
    const config = await getConfigOrDefault()
    setConfig(config)
  }, [])
  
  useEffect(() => {
    getConfigOrDefault().then(config => {
      setConfig(config)
      chrome.storage.onChanged.addListener(handleStorageChange)
    })
  }, [])
  

  return <div className="App">
    {config && (
      <>
        <h1>Options</h1>
        <div className="field">
          <span>slow down hotkey ( &lt;&lt; )</span>
          <KeyPicker value={config.decrementKey} onChange={v => {
            persistConfig(produce(config, d => {
              d.decrementKey = v
            }))
          }}/>
        </div>
        <div className="field">
          <span>reset hotkey ( = )</span>
          <KeyPicker value={config.resetKey} onChange={v => {
            persistConfig(produce(config, d => {
              d.resetKey = v
            }))
          }}/>
        </div>
        <div className="field">
          <span>speed up hotkey ( &gt;&gt; )</span>
          <KeyPicker value={config.incrementKey} onChange={v => {
            persistConfig(produce(config, d => {
              d.incrementKey = v
            }))
          }}/>
        </div>
        <div className="field">
          <span>reset value ( = )</span>
          <NumericInput value={config.defaultSpeed} onChange={v => {
            persistConfig(produce(config, d => {
              d.defaultSpeed = v
            }))
          }}/>
        </div>
      </>
    )}
  </div>
}

ReactDOM.render(<Options/>, document.querySelector("#root"))