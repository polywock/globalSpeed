
import 'regenerator-runtime/runtime'
import { roundToStep, getConfigOrDefault, persistSpeed, getSpeed, requestTabId, conformSpeed, getPin, togglePin, formatSpeed } from "../utils"
import { Indicator } from "./Indicator"

const INPUT_TAGS = ["INPUT", "TEXTAREA"]
const MEDIA_TAGS = ["VIDEO", "AUDIO"]

let indicator: Indicator

main()

async function main() {
  indicator = new Indicator() 
  chrome.storage.onChanged.addListener(() => handleInterval())
  setInterval(handleInterval, 300)
  window.addEventListener("keydown", handleKeyDown)
  document.body.appendChild(indicator.wrapper)
}


async function handleInterval(){
  const config = await getConfigOrDefault()
  const tabId = await requestTabId()
  const speed = getSpeed(config, tabId)

  for (let tag of MEDIA_TAGS) {
    for (let elem of document.getElementsByTagName(tag)) {
      (elem as HTMLMediaElement).playbackRate = speed
    }
  }
}


async function handleKeyDown(e: KeyboardEvent) {
  const config = await getConfigOrDefault()
  if (config.hotkeys === "disabled") {
    return 
  } else if (config.hotkeys === "ifVideo") {
    if (document.getElementsByTagName("video").length === 0) {
      if (document.getElementsByTagName("audio").length === 0) {
        return 
      }
    }
  }

  // stop If input field 
  const target = e.target as HTMLElement
  if (INPUT_TAGS.includes(target.tagName) || target.isContentEditable) {
    return 
  }
  const tabId = await requestTabId()
  const speed = getSpeed(config, tabId)
  const isPinned = !!getPin(config, tabId)


  const showIndicator = (speed: number, isPinned: boolean) => {
    indicator.showIndicator(formatSpeed(speed, isPinned), 1500)
  }

  if (e.metaKey || e.shiftKey || e.ctrlKey || e.altKey) {
    return
  }

  if (e.code === config.incrementKey) {
    const newSpeed = conformSpeed(roundToStep(speed + config.stepValue ?? 0.1, config.stepValue ?? 0.1))
    persistSpeed(config, newSpeed, tabId)
    showIndicator(newSpeed, isPinned)
  } else if (e.code === config.decrementKey) {
    const newSpeed = conformSpeed(roundToStep(speed - config.stepValue ?? 0.1, config.stepValue ?? 0.1))
    persistSpeed(config, newSpeed, tabId)
    showIndicator(newSpeed, isPinned)
  } else if (e.code === config.resetKey) {
    const newSpeed = conformSpeed(config.defaultSpeed)
    persistSpeed(config, config.defaultSpeed, tabId)
    showIndicator(newSpeed, isPinned)
  } else if (e.code === config.pinKey) {
    togglePin(config, tabId)
    showIndicator(config.speed, !isPinned)
  }

  
}



