import "regenerator-runtime/runtime"
import React, { useState, useEffect, useCallback } from "react"
import ReactDOM from "react-dom"
import { KeyPicker } from "../comps/KeyPicker"
import { NumericInput } from "../comps/NumericInput"
import { Config } from "../types"
import { getConfigOrDefault, persistConfig } from "../utils"
import produce from "immer"
import { getDefaultConfig } from "../defaults"
import "./options.scss"

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
          <span>hotkeys</span>
          <select value={config.hotkeys} onChange={e => {
            persistConfig(produce(config, d => {
              d.hotkeys = e.target.value as typeof d.hotkeys
            }))
          }}>
            <option value="enabled">enabled</option>
            <option value="ifVideo">if page has video/audio.</option>
            <option value="disabled">disabled</option>
          </select>
        </div>
        {config.hotkeys !== "disabled" && (
          <>
            <div className="field" style={{marginTop: "20px"}}>
              <span>slow down hotkey ( &lt;&lt; )</span>
              <KeyPicker value={config.decrementKey} onChange={v => {
                persistConfig(produce(config, d => {
                  d.decrementKey = v
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
              <span>step value</span>
              <NumericInput value={config.stepValue ?? 0.1} onChange={v => {
                persistConfig(produce(config, d => {
                  d.stepValue = v
                }))
              }}/>
            </div>
            <div className="field" style={{marginTop: "20px"}}>
              <span>reset hotkey ( = )</span>
              <KeyPicker value={config.resetKey} onChange={v => {
                persistConfig(produce(config, d => {
                  d.resetKey = v
                }))
              }}/>
            </div>
            <div className="field">
              <span>reset value</span>
              <NumericInput value={config.defaultSpeed} onChange={v => {
                persistConfig(produce(config, d => {
                  d.defaultSpeed = v
                }))
              }}/>
            </div>
            <div className="field" style={{marginTop: "20px"}}>
              <span>pin hotkey {`📌`}</span>
              <KeyPicker value={config.pinKey} onChange={v => {
                persistConfig(produce(config, d => {
                  d.pinKey = v
                }))
              }}/>
            </div>
          </>
        )}
        <div className="field">
          <span>pin by default</span>
          <input type="checkbox" checked={config.pinByDefault} onChange={e => {
            persistConfig(produce(config, d => {
              d.pinByDefault = e.target.checked
            }))
          }}/>
        </div>
      </>
    )}
    <button style={{marginTop: "20px"}} onClick={e => {
      persistConfig(getDefaultConfig())
    }}>Default</button>
  </div>
}

ReactDOM.render(<Options/>, document.querySelector("#root"))