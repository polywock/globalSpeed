import { Root, createRoot } from "react-dom/client"
import { SectionFlags } from "./SectionFlags"
import { SectionEditor } from "./SectionEditor"
import { SectionHelp } from "./SectionHelp"
import { SectionRules } from "./SectionRules"
import { ErrorFallback } from "../comps/ErrorFallback"
import { useThemeSync } from "src/hooks/useThemeSync"
import { loadGsm } from "src/utils/gsm"
import "./options.css"
import { requestCreateTab, requestTabInfo } from "src/utils/browserUtils"
import type { Indicator } from "src/contentScript/isolated/utils/Indicator"
import { useStateView } from "src/hooks/useStateView"
import { isEdge, isFirefox } from "src/utils/helper"
import { GoX } from "react-icons/go"

declare global {
  interface Window {
    root?: Root
    
  }

  interface GlobalVar {
    indicator?: Indicator,
    isOptionsPage?: boolean
  }
}

const Options = (props: {}) => {
  useThemeSync()
  return <div id="App">
    <Promo/>
    <SectionFlags/>
    <SectionEditor/>
    <SectionRules/>
    <SectionHelp/>
  </div>
}


Promise.all([loadGsm(), requestTabInfo()]).then(([gsm, tabInfo]) => {
  gvar.isOptionsPage = true 
  gvar.gsm = gsm 
  gvar.tabInfo = tabInfo 
  document.documentElement.lang = gsm._lang
  window.root = createRoot(document.querySelector("#root"))
  window.root.render(<ErrorFallback><Options/></ErrorFallback>)
})


const MAX_TIME = (new Date('2025/01/01')).getTime()
const now = Date.now() 

function Promo() {
  const [state, setState] = useStateView({gptWebsiteCounter: true})
  if (!(state?.gptWebsiteCounter >= 5 && state.gptWebsiteCounter !== -1 && now < MAX_TIME)) return 
  let link = isFirefox() ? "https://addons.mozilla.org/firefox/addon/gpt-search" : (isEdge() ? "https://microsoftedge.microsoft.com/addons/detail/gpt-search/hcnfioacjbamffbgigbjpdlflnlpaole" : "https://chromewebstore.google.com/detail/gpt-search/glhkbfoibolghhfikadjikgfmaknpelb")
  const openLink = () => {
    requestCreateTab(link)
  }
  const [lb, rb] = gvar.gsm.options.flags.gptPromo.split("$1")
  return (
    <div onClickCapture={e => {
      if ((e.target as HTMLElement).tagName === "svg") {
        setState({gptWebsiteCounter: -1})
      } else {
        openLink()
      }
    }} className="section promo">{lb}<span className="a"><img src={chrome.runtime.getURL("icons/gptSearch.png")}/> GPT Search</span>{rb}<GoX size="1.6rem"/></div>
  )
}
