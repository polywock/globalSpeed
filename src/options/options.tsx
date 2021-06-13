import ReactDOM from "react-dom"
import { SectionFlags } from "./SectionFlags"
import { SectionEditor } from "./SectionEditor"
import { SectionHelp } from "./SectionHelp"
import { requestGsm } from "../utils/configUtils"
import { SectionRules } from "./SectionRules"
import { ErrorFallback } from "../comps/ErrorFallback"
import { useThemeSync } from "src/hooks/useThemeSync"
import "./options.scss"

const Options = (props: {}) => {
  useThemeSync()
  return <div id="App">
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




