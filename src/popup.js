

const speedInput = document.querySelector("#speed-input")
const options = document.querySelectorAll(".options > div")

document.querySelector("#dec1").addEventListener("click", () => incrementSpeed(-0.01))
document.querySelector("#dec5").addEventListener("click", () => incrementSpeed(-0.05))
document.querySelector("#inc1").addEventListener("click", () => incrementSpeed(+0.01))
document.querySelector("#inc5").addEventListener("click", () => incrementSpeed(+0.05))

options.forEach(option => {
  option.addEventListener("click", e => {
    changeSpeed(parseFloat(e.target.innerText))
  })
})

var speed = 1.0 

// get speed from local storage. 
chrome.storage.local.get(items => {
  // Sync with UI. 
  changeSpeed(items["speed"] || speed)
})

function incrementSpeed(delta) {
  changeSpeed(speed + delta)
}

function changeSpeed(newSpeed) {
  speed = Math.round(newSpeed * 100) / 100
  speedInput.value = speed 
  options.forEach(option => {
    option.classList.remove("selected")
    if (parseFloat(option.innerText) === speed) {
      option.classList.add("selected")
    }
  })
  chrome.storage.local.set({ speed })
}

// listen to changes from speed input. 
speedInput.addEventListener("change", e => {
  if (/^[0-9\.]+$/.test(speedInput.value)) {
    changeSpeed(parseFloat(speedInput.value))
  } else {
    // enable error 
  }
  e.preventDefault()
})

