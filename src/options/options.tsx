import "regenerator-runtime/runtime"
import React, { useState, useEffect, useCallback } from "react"
import ReactDOM from "react-dom"
import { Config, KeyBind } from "../types"
import { getConfigOrDefault, persistConfig } from "../utils/configUtils"
import { clamp, isFirefox } from "../utils/helper"
import { getDefaultConfig } from "../defaults"
import { commandInfos, CommandName, getDefaultKeyBinds } from "../defaults/commands"
import { KeyBindControl } from "./KeyBindControl"
import produce from "immer"
import { Tooltip } from "../comps/Tooltip"
import { GoPin, GoZap } from "react-icons/go"
import { FaPowerOff } from "react-icons/fa"
import { requestCreateTab } from "../utils/browserUtils"
import { NumericInput } from "../comps/NumericInput"
import "./options.scss"

function Options(props: {}) {
  const [config, setConfig] = useState(null as Config)
  const [commandOption, setCommandOption] = useState("adjustSpeed")
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  useEffect(() => {
    getConfigOrDefault().then(config => {
      setConfig(config)
    })
  }, [])

  const setAndPersistConfig = useCallback((config: Config) => {
    setConfig(config)
    persistConfig(config)
  }, [])

  if (!config) {
    return <span>Loading...</span>
  }

  const handleKeyBindChange = (id: string, newKb: KeyBind) => {
    setAndPersistConfig(produce(config, d => {
      const idx = d.keybinds.findIndex(v => v.id === id)
      d.keybinds[idx] = newKb
    }))
  }

  const handleKeyBindRemove = (id: string) => {
    setAndPersistConfig(produce(config, d => {
      const idx = d.keybinds.findIndex(v => v.id === id)
      d.keybinds.splice(idx, 1)
    }))
  }

  const handleKeyBindMove = (id: string, down: boolean) => {
    setAndPersistConfig(produce(config, dConfig => {
      let idx = dConfig.keybinds.findIndex(v => v.id === id)
      let kb = dConfig.keybinds[idx]
      let newIdx = clamp(0, dConfig.keybinds.length - 1, idx + (down ? 1 : -1))
      dConfig.keybinds.splice(idx, 1)
      dConfig.keybinds.splice(newIdx, 0, kb)
    }))
  }
  

  return <div className="App">
    <h2>{chrome.i18n.getMessage("options__shortcutsHeader")}</h2>
    <div>
      <p><code>M</code>: {chrome.i18n.getMessage("options__mediaToggleDesc")}</p>
      <p><code>G</code>: {chrome.i18n.getMessage("options__greedyToggleDesc")}</p>
    </div>

    <div className="keyBindControls">
      {(config.keybinds || []).map(bind => (
        <KeyBindControl key={bind.id} value={bind} 
          onChange={handleKeyBindChange} 
          onRemove={handleKeyBindRemove}
          onMove={handleKeyBindMove}
        />
      ))}
    </div>
    <div className="add">
      <select value={commandOption} onChange={e => {
        setCommandOption(e.target.value)
      }}>
        {Object.keys(commandInfos).map(v => (
          <option key={v} value={v}>{commandInfos[v as CommandName].name}</option>
        ))}
      </select>
      <button onClick={e => {
        setAndPersistConfig(produce(config, d => {
          d.keybinds.push(commandInfos[commandOption as CommandName].generate())
        }))
      }}>{chrome.i18n.getMessage("options__addButton")}</button>
      <button onClick={e => {
        setAndPersistConfig(produce(config, d => {
          d.keybinds = getDefaultKeyBinds()
        }))
      }}>{chrome.i18n.getMessage("options__resetButton")}</button>
    </div>
    <h2 style={{marginTop: "40px"}}>{chrome.i18n.getMessage("options__optionsHeader")}</h2>
    <div className="fields">
      <div>
        <div className="labelWithTooltip">
          <span>{chrome.i18n.getMessage("options__pinByDefault")}</span>
          <Tooltip tooltip={chrome.i18n.getMessage("options__pinByDefaultTooltip")}/>
        </div>
        <input type="checkbox" checked={config.pinByDefault || false} onChange={e => {
          setAndPersistConfig(produce(config, d => {
            d.pinByDefault = e.target.checked
          }))
        }}/>
      </div>
      <div>
        <div className="labelWithTooltip">
          <span>{chrome.i18n.getMessage("options__hideIndicator")}</span>
          <Tooltip tooltip={chrome.i18n.getMessage("options__hideIndicatorTooltip")}/>
        </div>
        <input type="checkbox" checked={config.hideIndicator || false} onChange={e => {
          setAndPersistConfig(produce(config, d => {
            d.hideIndicator = e.target.checked
          }))
        }}/>
      </div>
      <div>
        <div className="labelWithTooltip">
          <span>{chrome.i18n.getMessage("options__hideBadge")}</span>
          <Tooltip tooltip={chrome.i18n.getMessage("options__hideBadgeTooltip")}/>
        </div>
        <input type="checkbox" checked={config.hideBadge || false} onChange={e => {
          setAndPersistConfig(produce(config, d => {
            d.hideBadge = e.target.checked
          }))
        }}/>
      </div>
      {!showAdvanced && (
        <button onClick={e => setShowAdvanced(!showAdvanced)}>{chrome.i18n.getMessage("options__showAdvancedButton")}</button>
      )}
      {showAdvanced && (
        <>
          <div>
            <div className="labelWithTooltip">
              <span>{chrome.i18n.getMessage("options__usePolling")}</span>
              <Tooltip tooltip={chrome.i18n.getMessage("options__usePollingTooltip")}/>
            </div>
            <input type="checkbox" checked={config.usePolling || false} onChange={e => {
              setAndPersistConfig(produce(config, d => {
                d.usePolling = e.target.checked
              }))
            }}/>
          </div>
          {config.usePolling && (
            <div>
              <div className="labelWithTooltip">
                <span>polling rate</span>
                <Tooltip tooltip="In ms (or milliseconds). For reference, 1000 ms == 1 second."/>
              </div>
              <NumericInput value={config.pollRate} placeholder={"defaults to 1000ms"} onChange={v => {
                setAndPersistConfig(produce(config, d => {
                  d.pollRate = v
                }))
              }}/>
            </div>
          )}
        </>
      )}
    </div>
    <h2>{chrome.i18n.getMessage("options__HelpHeader")}</h2>
      <div className="card">{chrome.i18n.getMessage("options__issuePrompt")} <a href="https://github.com/polywock/globalSpeed/issues">{chrome.i18n.getMessage("options__issueDirective")}</a></div>
    <div>  
      <p><code>{chrome.i18n.getMessage("options__help__stateLabel")} <FaPowerOff color="#35b" size="17px"/></code>: {chrome.i18n.getMessage("options__help__stateDesc")}</p>
      <p><code>{chrome.i18n.getMessage("options__help__pinLabel")} <GoPin color="#35b" size="20px"/></code>: {chrome.i18n.getMessage("options__help__pinDesc")}</p>
      <p><code>{chrome.i18n.getMessage("options__help__fxLabel")} <GoZap color="#35b" size="20px"/></code>: {chrome.i18n.getMessage("options__help__fxDesc")}</p>
      <p>{chrome.i18n.getMessage("options__help__localPrompt")} <a onClick={e => {
        e.preventDefault()
        if (isFirefox()) {
          requestCreateTab(`https://support.mozilla.org/en-US/kb/extensions-private-browsing`)
        } else {
          requestCreateTab(`chrome://extensions/?id=${chrome.runtime.id}`)
        }
      }}>{chrome.i18n.getMessage("options__help__localDirective")}</a></p>
    </div>
    {isFirefox() && (
      <div className="card red">{chrome.i18n.getMessage("firefoxBackdropWarning")}</div>
    )}
    <div>
      <button style={{marginTop: "40px"}} className="large red" onClick={e => {
        setAndPersistConfig(getDefaultConfig())
      }}>{chrome.i18n.getMessage("options__help__resetToDefaultButton")}</button>
    </div>
  </div>
}

ReactDOM.render(<Options/>, document.querySelector("#root"))