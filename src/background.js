



function updateBadge() {
  chrome.storage.local.get(items => {
    chrome.browserAction.setBadgeText({
      text: (items["speed"] || 1).toString().slice(0, 4) + "x"
    })
    chrome.browserAction.setBadgeBackgroundColor({
      color: "#a64646"
    })
  })  
}

updateBadge() 

chrome.storage.onChanged.addListener(() => {
  updateBadge()
})
