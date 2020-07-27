import React from "react"
import ReactDOM from "react-dom"
import { SectionFlags } from "./SectionFlags"
import { SectionEditor } from "./SectionEditor"
import { SectionHelp } from "./SectionHelp"
import { ThemeSync } from "../comps/ThemeSync"
import { requestGsm } from "../utils/configUtils"
import { SectionRules } from "./SectionRules"
import { ErrorFallback } from "../comps/ErrorFallback"
import "./options.scss"

const Options = (props: {}) => {
  return <div id="App">
    <ThemeSync/>
    <SectionFlags/>
    <SectionEditor/>
    <SectionRules/>
    <SectionHelp/>
  </div>
}


requestGsm().then(gsm => {
  window.gsm = gsm 
  ReactDOM.render(<ErrorFallback><Options/></ErrorFallback>, document.querySelector("#root"))
})




