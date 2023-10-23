import { useState } from "react"
import ReactDOM from "react-dom"
import { Header } from "./Header"
import { getActiveTabInfo } from "../utils/browserUtils"
import { MainPanel } from "./MainPanel"
import { FxPanel } from "./FxPanel"
import { AudioPanel } from "notFirefox/popup/AudioPanel"
import { requestGsm } from "../utils/configUtils"
import { ErrorFallback } from "../comps/ErrorFallback"
import { useStateView } from "../hooks/useStateView"
import { FaPowerOff } from "react-icons/fa"
import { pushView } from "../background/GlobalState"
import { useThemeSync } from "src/hooks/useThemeSync"
import "./popup.scss"
import { createRoot } from "react-dom/client"


export function App(props: {}) {
  const [panel, setPanel] = useState(0)
  const [view, setView] = useStateView({superDisable: true})
  useThemeSync()

  if (!view) return null 

  if (view.superDisable) {
    return (
      <div 
        id={"SuperDisable"}
        onClick={() => {
          pushView({override: {superDisable: false, enabled: true}, tabId: gvar.tabInfo.tabId})
        }}
        onContextMenu={e => {
          e.preventDefault()
          pushView({override: {superDisable: false, enabled: true}, tabId: gvar.tabInfo.tabId})
        }}
      >
        <FaPowerOff size="25px"/>
      </div>
    )
  }

  return (
    <div id="App">
      <Header panel={panel} setPanel={v => setPanel(v)}/>
      {panel === 0 && <MainPanel/>}
      {panel === 1 && <FxPanel/>}
      {panel === 2 && AudioPanel && <AudioPanel/>}
    </div>
  )
}

Promise.all([
  requestGsm().then(gsm => {
    window.gsm = gsm 
  }),
  getActiveTabInfo().then(tabInfo => {
    gvar.tabInfo = tabInfo
    gvar.tabInfo || window.close()
  })
]).then(() => {
  const root = createRoot(document.querySelector("#root"))
  root.render(<ErrorFallback><App/></ErrorFallback>)
})

