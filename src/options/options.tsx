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
import { GoPin, GoVersions, GoZap } from "react-icons/go"
import { FaPowerOff } from "react-icons/fa"
import "./options.scss"
import { requestCreateTab } from "../utils/browserUtils"

function Options(props: {}) {
  const [config, setConfig] = useState(null as Config)
  const [commandOption, setCommandOption] = useState("adjustSpeed")

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

  if (!config) {
    return <div>
      <span>Loading...</span>
      <button onClick={e => {
        persistConfig(getDefaultConfig())
      }}>Default</button>
    </div>
  }

  const handleKeyBindChange = (id: string, newKb: KeyBind) => {
    persistConfig(produce(config, d => {
      const idx = d.keybinds.findIndex(v => v.id === id)
      d.keybinds[idx] = newKb
    }))
  }

  const handleKeyBindRemove = (id: string) => {
    persistConfig(produce(config, d => {
      const idx = d.keybinds.findIndex(v => v.id === id)
      d.keybinds.splice(idx, 1)
    }))
  }

  const handleKeyBindMove = (id: string, down: boolean) => {
    persistConfig(produce(config, dConfig => {
      let idx = dConfig.keybinds.findIndex(v => v.id === id)
      let kb = dConfig.keybinds[idx]
      let newIdx = clamp(0, dConfig.keybinds.length - 1, idx + (down ? 1 : -1))
      dConfig.keybinds.splice(idx, 1)
      dConfig.keybinds.splice(newIdx, 0, kb)
    }))
  }
  

  return <div className="App">
    <h2 style={{marginTop: "40px"}}>Keybinds</h2>
    <div>
      <p><code>M</code>: media keybinds will only work if page has video or audio.</p>
      <p><code>G</code>: greedy keybinds will try to block event propogation and default behaviors.</p>
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
        persistConfig(produce(config, d => {
          d.keybinds.push(commandInfos[commandOption as CommandName].generate())
        }))
      }}>Add</button>
      <button onClick={e => {
        persistConfig(produce(config, d => {
          d.keybinds = getDefaultKeyBinds()
        }))
      }}>Reset</button>
    </div>
    <h2 style={{marginTop: "40px"}}>Options</h2>
    <div className="fields">
      <div>
        <div className="labelWithTooltip">
          <span>pin by default</span>
          <Tooltip tooltip="Each tab will be pinned by default."/>
        </div>
        <input type="checkbox" checked={config.pinByDefault} onChange={e => {
          persistConfig(produce(config, d => {
            d.pinByDefault = e.target.checked
          }))
        }}/>
      </div>
      <div>
        <div className="labelWithTooltip">
          <span>hide indicator</span>
          <Tooltip tooltip="Some hotkey commands show a feedback indicator on the top-left of the page."/>
        </div>
        <input type="checkbox" checked={config.hideIndicator} onChange={e => {
          persistConfig(produce(config, d => {
            d.hideIndicator = e.target.checked
          }))
        }}/>
      </div>
      <div>
        <div className="labelWithTooltip">
          <span>hide badge</span>
          <Tooltip tooltip="The badge is the text on the extension icon."/>
        </div>
        <input type="checkbox" checked={config.hideBadge} onChange={e => {
          persistConfig(produce(config, d => {
            d.hideBadge = e.target.checked
          }))
        }}/>
      </div>
    </div>
    <h2>Help</h2>
    <div className="card">Have issues or a suggestion? Create a <a href="https://github.com/polywock/globalSpeed/issues">new issue</a> on the <a href="https://github.com/polywock/globalSpeed">Github page</a>.</div>
    <div>  
      <p><code>State <FaPowerOff color="#35b" size="17px"/></code>: You can suspend the extension for all tabs, or a specific tab (if pinned). Speed will no longer set. And all hotkeys except <code>set state</code> will cease to work.</p>
      <p><code>Pin <GoPin color="#35b" size="20px"/></code>: Pinning a tab allows it to have it's own context (speed, filters, etc). A global context applies to all tabs unless tab is pinned (has it's own local context). </p>
      <p><code>FX <GoZap color="#35b" size="20px"/></code>: You can enable filters (contrast, invert, grayscale, etc) on elements (by default, only video elements) or even the whole page with backdrop. </p>
      <p><code>Double Invert</code> is useful trick to simulate dark theme. Invert the entire page with backdrop, and also invert videos, which will cause them to invert back into their original color, while the UI remains dark.</p>
      <p>For the extension to work with <code>File URLs</code> or on <code>Incognito mode</code>, they need to be enabled at the extension page -> <a onClick={e => {e.preventDefault(); requestCreateTab(`chrome://extensions/?id=${chrome.runtime.id}`)}}>Chrome/Edge</a> or <a onClick={e => {e.preventDefault(); requestCreateTab(`https://support.mozilla.org/en-US/kb/extensions-private-browsing`)}}>Firefox</a>.</p>
    </div>
    {isFirefox() && (
      <div className="card red">Warning: For backdrop filters, Firefox users need to enable need to enable <code>gfx.webrender.all</code> and <code>layout.css.backdrop-filter.enabled</code> by going to the <code>about:page</code> url. Restart Firefox after enabling the two flags.</div>
    )}
    <div>
      <button style={{marginTop: "40px"}} className="large red" onClick={e => {
        persistConfig(getDefaultConfig())
      }}>Reset to Default</button>
    </div>
  </div>
}

ReactDOM.render(<Options/>, document.querySelector("#root"))