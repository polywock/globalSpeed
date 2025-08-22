import { MouseEvent, useEffect, useRef, useState } from "react"
import { MdContentCopy, MdContentPaste } from "react-icons/md"
import { dumpConfig, fetchView, pushView, restoreConfig } from "../utils/state"
import { State } from "../types"
import { requestCreateTab } from "../utils/browserUtils"
import { isFirefox, areYouSure, isMobile } from "../utils/helper"
import { getDefaultState } from "src/defaults"
import { migrateSchema } from "src/background/utils/migrateSchema"
import { Tooltip } from "src/comps/Tooltip"
import "./SectionHelp.css"


export function SectionHelp(props: {}) {

  return (
    <div className="section SectionHelp">

      {/* Header */}
      <h2 onClick={handleSecretMenu}>{gvar.gsm.options.help.header}</h2>

      {/* Issue prompt */}
      <div className="card">{gvar.gsm.options.help.issuePrompt} <a href="https://github.com/polywock/globalSpeed/issues">{gvar.gsm.options.help.issueDirective}</a></div>

      <div className="controls">
        
        {/* Reset  */}
        <button className="large" onClick={async e => {
          if (!areYouSure()) return 

          window.root.unmount()
          await chrome.storage.local.clear()
          await restoreConfig(getDefaultState(), false)
          window.location.reload()
          
        }}>{gvar.gsm.token.reset}</button>

        {/* Export/Import  */}
        {!isMobile() && <>
          <button className="large" onClick={e => {
            requestCreateTab(chrome.runtime.getURL("./faqs.html"))
          }}>{"FAQ"}</button>
          <div className="right">
            <ExportImport/>
          </div>
        </>}
      </div>
    </div>
  )
}

let helpClicked = 0 

function handleSecretMenu(e: MouseEvent) {
  helpClicked++
  if (helpClicked >= 10) {
    const command = prompt("Command? ")?.toLowerCase()
    if (!command) {
      return 
    } else if (command === "toggle url banner") {
      fetchView({hideOrlBanner: true}).then(view => {
        if (confirm(`Do you want to ${view.hideOrlBanner ? "show" : "hide"} the URL banner? `)) {
          pushView({override: {hideOrlBanner: !view.hideOrlBanner}})
        }
      })
    } else if (command === "toggle pip priority") {
      fetchView({ignorePiP: true}).then(view => {
        if (confirm(`Do you want to ${view.ignorePiP ? "" : "de"}prioritize PiP videos? `)) {
          pushView({override: {ignorePiP: !view.ignorePiP}})
        }
      })
    } else {
      alert("Invalid command.")
    }
  }
}


function ExportImport(props: {}) {
  const ref = useRef({} as {input?: HTMLInputElement})
  const [showWasCopied, setShowWasCopied] = useState(false)

  useEffect(() => {
    const input = document.createElement("input")
    ref.current.input = input 
    input.type = "file"
    input.accept = ".json"
    input.setAttribute("style", `position: fixed; left: -1000px; top: -1000px; opacity: 0;`)
    document.documentElement.appendChild(input)
    
    const handleChange = (e: Event) => {
      if (!input.files[0]) return 
      loadStateFromFile(input.files[0])
    }

    input.addEventListener("change", handleChange)
    return () => {
      input.removeEventListener("change", handleChange)
      input.remove()
    }
  }, [])

  return <>
    <Tooltip title={gvar.gsm.options.help.exportTooltip} align="top">
      <button className="large" onClick={async () => {
        downloadState(await dumpConfig())
      }}>{gvar.gsm.options.help.export}</button>  
    </Tooltip>
    <Tooltip title={showWasCopied ? gvar.gsm.options.help.copied : gvar.gsm.options.help.copy} align="top">
      <button className="large" onClick={async e => {
        await navigator.clipboard.writeText(JSON.stringify(await dumpConfig()))
        setShowWasCopied(true)
        setTimeout(() => setShowWasCopied(false), 1000)
      }}><MdContentCopy style={{pointerEvents: 'none'}}/></button>
    </Tooltip>
    <Tooltip title={gvar.gsm.options.help.importTooltip} align="top">
      <button 
        className="large" 
        onClick={e => {
          ref.current.input.click()
        }}
      >{gvar.gsm.options.help.import}</button>
    </Tooltip>
    <Tooltip title={gvar.gsm.options.help.paste} align="top">
      <button className="large" onClick={async e => {
        if (isFirefox()) {
          if (!(await chrome.permissions.request({permissions: ["clipboardRead", "clipboardWrite"]}))) return 
        }

        loadState(await navigator.clipboard.readText())
      }}><MdContentPaste/></button>
    </Tooltip>
  </>
}

export function downloadState(state: State){
  const a = document.createElement("a")
  a.setAttribute("href", window.URL.createObjectURL(new Blob([JSON.stringify(state)], {type: "application/json"})));
  a.setAttribute('download', `Global Speed - ${new Date().toDateString()}.json`)
  a.setAttribute("style", "position: fixed; left: -1000px; top: 1000px; opacity: 0;")
  document.documentElement.append(a)
  a.click()
  a.remove()
}

function readFile(file: File, cb: (result: string) => void) {
  const fileReader = new FileReader()
  fileReader.addEventListener("load", () => {
    if (fileReader.result) {
      cb(fileReader.result as string)
    }
  })
  fileReader.readAsText(file)
}

function loadStateFromFile(file: File) {
  try {
    readFile(file, result => {
      if (!result) return 
      loadState(result)
    })
  } catch (err) {}
}


async function loadState(text: string) {
  if (!areYouSure()) return 
  await restoreConfig(migrateSchema(JSON.parse(text)))
  window.location.reload()
}