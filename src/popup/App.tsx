import React, { useEffect, useState, useCallback } from "react"
import { getConfigOrDefault, persistSpeed, getSpeed, togglePin, getPin, getActiveTabId } from "../utils"
import { Config} from "../types"
import { SpeedControl } from "../options/SpeedControl"
import { GoPin, GoGear, GoMarkGithub } from "react-icons/go"
import "./App.scss"

export function App(props: {}) {
  const [config, setConfig] = useState(null as Config)
  const [tabId, setTabId] = useState(null as number)

  const handleStorageChange = useCallback(async () => {
    const config = await getConfigOrDefault()
    setConfig(config)
  }, [])

  
  useEffect(() => {
    getConfigOrDefault().then(config => {
      setConfig(config)
      chrome.storage.onChanged.addListener(handleStorageChange)

      // get pin state of current tab.
      chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        if (tabs.length > 0) {
          setTabId(tabs[0].id)
        }
      })
    })
  }, [])


  
  if (!config ){
    return <div>Loading...</div>
  }

  return (
    <div id="App">
      <div className="header">
        {tabId && (
          <div 
            className={`pin ${getPin(config, tabId) ? "active" : ""}`}
            onClick={() => togglePin(config, tabId)}
          >
            <GoPin size="20px"/>
          </div>
        )}
        <div onClick={e => {
          chrome.runtime.openOptionsPage()
        }}>
          <GoGear size="20px"/>
        </div>
        <div onClick={e => {
          window.open("https://github.com/polywock/globalSpeed", "_blank")
        }}>
          <GoMarkGithub size="18px"/>
        </div>

      </div>
      <SpeedControl speed={getSpeed(config, tabId)} onChange={v => persistSpeed(config, v, tabId)}/>
    </div>
  )
}
