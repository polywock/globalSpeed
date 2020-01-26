
import 'regenerator-runtime/runtime'
import { roundToStep, getConfigOrDefault, persistSpeed, getSpeed, getActiveTabId, conformSpeed } from "../utils"
import { Indicator } from "./Indicator"

const INPUT_TAGS = ["INPUT", "TEXTAREA"]
const MEDIA_TAGS = ["VIDEO", "AUDIO"]

let indicator: Indicator

main()

function main() {
  indicator = new Indicator() 
  chrome.storage.onChanged.addListener(() => handleInterval())
  setInterval(handleInterval, 300)
  window.addEventListener("keydown", handleKeyDown)
  document.body.appendChild(indicator.wrapper)
}


async function handleInterval(){
  const config = await getConfigOrDefault()
  const tabId = await getActiveTabId()
  const speed = getSpeed(config, tabId)

  for (let tag of MEDIA_TAGS) {
    for (let elem of document.getElementsByTagName(tag)) {
      (elem as HTMLMediaElement).playbackRate = speed
    }
  }
}


async function handleKeyDown(e: KeyboardEvent) {

  // stop If input field 
  const target = e.target as HTMLElement
  if (INPUT_TAGS.includes(target.tagName) || target.isContentEditable) {
    return 
  }

  const config = await getConfigOrDefault()
  const tabId = await getActiveTabId()
  const speed = getSpeed(config, tabId)

  if (e.code === config.incrementKey) {
    const newSpeed = roundToStep(speed + 0.1, 0.1)
    persistSpeed(config, newSpeed, tabId)
    indicator.showIndicator(`${conformSpeed(newSpeed).toFixed(1)}x`, 1500)
    
  } else if (e.code === config.decrementKey) {
    const newSpeed = roundToStep(speed - 0.1, 0.1)
    persistSpeed(config, newSpeed, tabId)
    indicator.showIndicator(`${conformSpeed(newSpeed).toFixed(1)}x`, 1500)

  } else if (e.code === config.resetKey) {
    const newSpeed = conformSpeed(config.defaultSpeed)
    persistSpeed(config, config.defaultSpeed, tabId)
    indicator.showIndicator(`${newSpeed.toFixed(2)}x`, 1500)
  }
}



