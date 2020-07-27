import React from "react"
import { getDefaultState } from "../defaults"
import { pushView } from "../background/GlobalState"
import { requestCreateTab } from "../utils/browserUtils"
import "./SectionHelp.scss"


export function SectionHelp(props: {}) {

  return (
    <div className="section SectionHelp">
      <h2>{window.gsm.options.help.header}</h2>
      <div className="card">{window.gsm.options.help.issuePrompt} <a href="https://github.com/polywock/globalSpeed/issues">{window.gsm.options.help.issueDirective}</a></div>
      <div className="controls">
        <button className="large" onClick={e => {
          pushView({override: {}, overDefault: true})
          setTimeout(() => {
            window.location.reload()
          }, 200)
        }}>{window.gsm.token.reset}</button>
        <button className="large" onClick={e => {
          requestCreateTab(chrome.runtime.getURL("./faqs.html"))
        }}>{"FAQs"}</button>
      </div>
    </div>
  )
}



