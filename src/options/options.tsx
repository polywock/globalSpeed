import "regenerator-runtime/runtime"
import React, { useState, useEffect, useCallback, useMemo } from "react"
import ReactDOM from "react-dom"
import { Config, KeyBind } from "../types"
import { getConfigOrDefault, persistConfig } from "../utils/configUtils"
import { clamp, isFirefox } from "../utils/helper"
import { getDefaultConfig } from "../defaults"
import { commandInfos, CommandName, getDefaultKeyBinds } from "../defaults/commands"
import { KeyBindControl } from "./KeyBindControl"
import { Tooltip } from "../comps/Tooltip"
import { GoPin, GoZap } from "react-icons/go"
import { FaPowerOff } from "react-icons/fa"
import { requestCreateTab, StorageChanges } from "../utils/browserUtils"
import { NumericInput } from "../comps/NumericInput"
import { LOCALE_MAP, ensureGsmLoaded } from "../utils/i18"
import produce from "immer"
import "./options.scss"

function Options(props: {}) {
  const [config, setConfig] = useState(null as Config)
  const [commandOption, setCommandOption] = useState("adjustSpeed")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const ref = useMemo(() => ({} as any), [])
  
  useEffect(() => {
    getConfigOrDefault().then(config => {
      setConfig(config)
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

  if (!config) {
    return <span></span>
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
    <h2 style={{marginTop: "40px"}}>{window.gsm["options_optionsHeader"] || ""}</h2>
    <div className="fields">
      <div className="field">
        <div className="labelWithTooltip">
          <span>{window.gsm["token_language"] || ""}</span>
          <Tooltip tooltip={window.gsm["options_languageTooltip"] || ""}/>
        </div>
        <select value={config.language || "detect"} onChange={e => {
          setAndPersistConfig(produce(config, d => {
            d.language = e.target.value 
          }))
          setTimeout(() => {
            window.location.reload()
          }, 50) 
        }}>
          {Object.keys(LOCALE_MAP).map(key => (
            <option key={key} value={key} title={LOCALE_MAP[key].title}>{LOCALE_MAP[key].display}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <div className="labelWithTooltip">
          <span>{window.gsm["options_pinByDefault"] || ""}</span>
          <Tooltip tooltip={window.gsm["options_pinByDefaultTooltip"] || ""}/>
        </div>
        <input type="checkbox" checked={config.pinByDefault || false} onChange={e => {
          setAndPersistConfig(produce(config, d => {
            d.pinByDefault = e.target.checked
          }))
        }}/>
      </div>
      <div className="field">
        <div className="labelWithTooltip">
          <span>{window.gsm["options_hideIndicator"] || ""}</span>
          <Tooltip tooltip={window.gsm["options_hideIndicatorTooltip"] || ""}/>
        </div>
        <input type="checkbox" checked={config.hideIndicator || false} onChange={e => {
          setAndPersistConfig(produce(config, d => {
            d.hideIndicator = e.target.checked
          }))
        }}/>
      </div>
      <div className="field">
        <div className="labelWithTooltip">
          <span>{window.gsm["options_hideBadge"] || ""}</span>
          <Tooltip tooltip={window.gsm["options_hideBadgeTooltip"] || ""}/>
        </div>
        <input type="checkbox" checked={config.hideBadge || false} onChange={e => {
          setAndPersistConfig(produce(config, d => {
            d.hideBadge = e.target.checked
          }))
        }}/>
      </div>
      {!showAdvanced && (
        <button onClick={e => setShowAdvanced(!showAdvanced)}>{window.gsm["options_showAdvancedButton"] || ""}</button>
      )}
      {showAdvanced && (
        <>
          <div className="field">
            <div className="labelWithTooltip">
              <span>{window.gsm["options_usePolling"] || ""}</span>
              <Tooltip tooltip={window.gsm["options_usePollingTooltip"] || ""}/>
            </div>
            <input type="checkbox" checked={config.usePolling || false} onChange={e => {
              setAndPersistConfig(produce(config, d => {
                d.usePolling = e.target.checked
              }))
            }}/>
          </div>
          {config.usePolling && (
            <div className="field">
              <div className="labelWithTooltip">
                <span>{window.gsm["options_pollingRate"] || ""}</span>
                <Tooltip tooltip={window.gsm["options_pollingRateTooltip"] || ""}/>
              </div>
              <NumericInput value={config.pollRate} placeholder={`${window.gsm["token_default"] || ""} 1000ms`} onChange={v => {
                setAndPersistConfig(produce(config, d => {
                  d.pollRate = v
                }))
              }}/>
            </div>
          )}
        </>
      )}
    </div>
    <h2>{window.gsm["options_shortcutsHeader"] || ""}</h2>
    <div>
      <p><code>M</code>: {window.gsm["options_mediaToggleDesc"] || ""}</p>
      <p><code>G</code>: {window.gsm["options_greedyToggleDesc"] || ""}</p>
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
          <option key={v} value={v}>{window.gsm[commandInfos[v as CommandName].name] || ""}</option>
        ))}
      </select>
      <button onClick={e => {
        setAndPersistConfig(produce(config, d => {
          d.keybinds.push(commandInfos[commandOption as CommandName].generate())
        }))
      }}>{window.gsm["token_create"] || ""}</button>
      <button onClick={e => {
        setAndPersistConfig(produce(config, d => {
          d.keybinds = getDefaultKeyBinds()
        }))
      }}>{window.gsm["token_reset"] || ""}</button>
    </div>
    <h2>{window.gsm["options_helpHeader"] || ""}</h2>
      <div className="card">{window.gsm["options_issuePrompt"] || ""} <a href="https://github.com/polywock/globalSpeed/issues">{window.gsm["options_issueDirective"] || ""}</a></div>
    <div>  
      <p><code><FaPowerOff color="#35b" size="17px"/></code>: {window.gsm["options_help_stateDesc"] || ""}</p>
      <p><code><GoPin color="#35b" size="20px"/></code>: {window.gsm["options_help_pinDesc"] || ""}</p>
      <p><code><GoZap color="#35b" size="20px"/></code>: {window.gsm["options_help_fxDesc"] || ""}</p>
      <p>{window.gsm["options_help_localPrompt"] || ""} <a onClick={e => {
        e.preventDefault()
        if (isFirefox()) {
          requestCreateTab(`https://support.mozilla.org/en-US/kb/extensions-private-browsing`)
        } else {
          requestCreateTab(`chrome://extensions/?id=${chrome.runtime.id}`)
        }
      }}>{window.gsm["options_help_localDirective"] || ""}</a></p>
    </div>
    {isFirefox() && (
      <div className="card red">{window.gsm["firefoxBackdropWarning"] || ""}</div>
    )}
    <div>
      <button style={{margin: "40px 0px"}} className="large red" onClick={e => {
        setAndPersistConfig(getDefaultConfig())
      }}>{window.gsm["options_help_resetToDefaultButton"] || ""}</button>
    </div>
  </div>
}

ensureGsmLoaded().then(() => {
  ReactDOM.render(<Options/>, document.querySelector("#root"))
})



