import React, { useState } from "react"
import ReactDOM from "react-dom"
import { Header } from "./Header"
import { getActiveTabInfo } from "../utils/browserUtils"
import { MainPanel } from "./MainPanel"
import { FxPanel } from "./FxPanel"
import { ThemeSync } from "../comps/ThemeSync"
import { AudioPanel } from "./AudioPanel"
import { requestGsm } from "../utils/configUtils"
import { ErrorFallback } from "../comps/ErrorFallback"
import "./popup.scss"


export function App(props: {}) {
  const [panel, setPanel] = useState(0)
  return (
    <div id="App">
      <ThemeSync/>
      <Header panel={panel} setPanel={v => setPanel(v)}/>
      {panel === 0 && <MainPanel/>}
      {panel === 1 && <FxPanel/>}
      {panel === 2 && <AudioPanel/>}
    </div>
  )
}

Promise.all([
  requestGsm().then(gsm => {
    window.gsm = gsm 
  }),
  getActiveTabInfo().then(tabInfo => {
    window.tabInfo = tabInfo
  })
]).then(() => {
  ReactDOM.render(<ErrorFallback><App/></ErrorFallback>, document.querySelector("#root"))
})

