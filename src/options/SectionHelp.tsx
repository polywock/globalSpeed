import { MouseEvent, useEffect, useRef } from "react"
import { MdContentCopy, MdContentPaste } from "react-icons/md"
import { dumpConfig, fetchView, pushView, restoreConfig } from "../utils/state"
import { State } from "../types"
import { requestCreateTab } from "../utils/browserUtils"
import { isFirefox, areYouSure, feedbackText, domRectGetOffset } from "../utils/helper"
import { getDefaultState } from "src/defaults"
import { migrateSchema } from "src/background/utils/migrateSchema"
import "./SectionHelp.css"

let helpClicked = 0 

export function SectionHelp(props: {}) {

  return (
    <div className="section SectionHelp">

      {/* Header */}
      <h2 onClick={v => {
        helpClicked++
        if (helpClicked >= 10) {
          const command = prompt("Command? ")
          if (!command) {
            return 
          } else if (command === "fs cache") {
            chrome.storage.local.get().then(items => {
              const entries = Object.entries(items).filter(([key]) => key.startsWith("fs::"))
              const cacheText = entries.map(([key, value]) => `${key.substr(4)} (${value?.length ?? 0})`).join("\n")
              if (entries.length) {
                if (confirm(`Delete fullscreen cache? \n${cacheText}`)) {
                  chrome.storage.local.remove(entries.map(([key]) => key))
                }
              } else {
                alert("No fullscreen cache.")
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
      }}>{gvar.gsm.options.help.header}</h2>

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
        <button className="large" onClick={e => {
          requestCreateTab(chrome.runtime.getURL("./faqs.html"))
        }}>{"FAQ"}</button>
        <div className="right">
          <ExportImport/>
        </div>
      </div>
    </div>
  )
}


function ExportImport(props: {}) {
  const ref = useRef({} as {input?: HTMLInputElement})

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
    <button className="large" onClick={async e => {
      downloadState(await dumpConfig())
    }}>{gvar.gsm.options.help.export}</button>
    <button className="large" onClick={async (e: MouseEvent<HTMLButtonElement>) => {
      if (isFirefox()) {
        if (!(await chrome.permissions.request({permissions: ["clipboardRead", "clipboardWrite"]}))) return 
      }
      await navigator.clipboard.writeText(JSON.stringify(await dumpConfig()))
      feedbackText(gvar.gsm.token.copy, domRectGetOffset((e.target as HTMLButtonElement).getBoundingClientRect(), 10, 10))
    }}><MdContentCopy style={{pointerEvents: 'none'}}/></button>
    <button 
      className="large" 
      onClick={e => {
        ref.current.input.click()
      }}
    >{gvar.gsm.options.help.import}</button>
    <button className="large" onClick={async e => {
      if (isFirefox()) {
        if (!(await chrome.permissions.request({permissions: ["clipboardRead", "clipboardWrite"]}))) return 
      }

      loadState(await navigator.clipboard.readText())
    }}><MdContentPaste/></button>
  </>
}

export function downloadState(state: State){
  const a = document.createElement("a")
  a.setAttribute("href", window.URL.createObjectURL(new Blob([JSON.stringify(state)], {type: "octet/stream"})));
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