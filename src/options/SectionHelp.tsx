import { MouseEvent, useEffect, useRef } from "react"
import { MdContentCopy, MdContentPaste } from "react-icons/md"
import { pushView } from "../background/GlobalState"
import { State } from "../types"
import { requestCreateTab } from "../utils/browserUtils"
import { isFirefox, areYouSure, feedbackText, domRectGetOffset } from "../utils/helper"
import "./SectionHelp.scss"
let helpClicked = 0 

export function SectionHelp(props: {}) {

  return (
    <div className="section SectionHelp">
      <h2 onClick={v => {
        helpClicked++
        if (helpClicked >= 10) {
          const command = prompt("Command? ")
          if (command === "fs cache") {
            chrome.storage.local.get(items => {
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
          } else if (command === "push sound") {
            chrome.runtime.sendMessage({type: "MEDIA_PUSH_SOUND", volume: parseFloat(prompt("Volume: ", "0.5"))})
          } else {
            alert("Invalid command.")
          }
        }
      }}>{window.gsm.options.help.header}</h2>
      <div className="card">{window.gsm.options.help.issuePrompt} <a href="https://github.com/polywock/globalSpeed/issues">{window.gsm.options.help.issueDirective}</a></div>
      <div className="controls">
        <button className="large" onClick={e => {
          if (!areYouSure()) return 
          pushView({override: {}, overDefault: true})
          setTimeout(() => {
            window.location.reload()
          }, 200)
        }}>{window.gsm.token.reset}</button>
        <button className="large" onClick={e => {
          requestCreateTab(chrome.runtime.getURL("./faqs.html"))
        }}>{"FAQs"}</button>
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
      setTimeout(() => {
        input.value = ""
      }, 100)
    }

    input.addEventListener("change", handleChange)
    return () => {
      input.removeEventListener("change", handleChange)
      input.remove()
    }
  }, [])

  return <>
    <button className="large" onClick={e => {
      chrome.runtime.sendMessage({type: "GET_STATE"}, state => {
        downloadState(state)
      })
    }}>{window.gsm.options.help.export}</button>
    <button className="large" onClick={(e: MouseEvent<HTMLButtonElement>) => {
      const cb = () => {
        chrome.runtime.sendMessage({type: "GET_STATE"}, state => {
          navigator.clipboard.writeText(JSON.stringify(state)).then(() => {
            feedbackText(window.gsm.token.copy, domRectGetOffset((e.target as HTMLButtonElement).getBoundingClientRect()))
          }, err => {})
        })
      }
      !isFirefox() ? cb() : chrome.permissions.request({permissions: ["clipboardRead", "clipboardWrite"]}, granted => {
        if (granted) cb()
      })
    }}><MdContentCopy/></button>
    <button 
      className="large" 
      onClick={e => {
        ref.current.input.click()
      }}
    >{window.gsm.options.help.import}</button>
    <button className="large" onClick={e => {
      const cb = () => {
        navigator.clipboard.readText().then(text => {
          try {
            loadState(JSON.parse(text))
          } catch (err) {}
        })
      }
      !isFirefox() ? cb() : chrome.permissions.request({permissions: ["clipboardRead", "clipboardWrite"]}, granted => {
        if (granted) cb()
      })
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
      loadState( JSON.parse(result))
    })
  } catch (err) {}
}

function loadState(state: State) {
  if (!areYouSure()) return 
  chrome.runtime.sendMessage({type: "RELOAD_STATE", state}, status => {
    if (status) {
      setTimeout(() => {
        window.location.reload()
      }, 100)
    }
  })
}