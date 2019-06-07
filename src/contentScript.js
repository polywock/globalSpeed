

function getStorage() {
  return new Promise((res, rej) => {
    chrome.storage.local.get(items => {
      if (chrome.runtime.lastError) {
        rej(chrome.runtime.lastError)
      } else {
        res(items)
      }
      return 
    })
  })
}

setInterval(async () => {
  const speed = (await getStorage())["speed"] || 1

  for (let elem of document.getElementsByTagName("video")) {
    elem.playbackRate = speed
  }

  for (let elem of document.getElementsByTagName("audio")) {
    elem.playbackRate = speed
  }
}, 300)
