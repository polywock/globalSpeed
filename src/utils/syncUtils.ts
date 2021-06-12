export function uploadSync(keyPrefix: string, data: any, fragmentCount = 10): Promise<void> {
  return new Promise((res, rej) => {
    const maxPerFragment = 8000
    let json = "" 
    try {
      json = JSON.stringify(data)
    } catch (err) {
      return rej()
    }
    let fragments: string[] = Array(fragmentCount).fill(" ")
    for (let i = 0; i < fragments.length; i++) {
      fragments[i] = json.substr(0, maxPerFragment)
      json = json.substr(maxPerFragment)
      if (!json.length) break 
    }
    if (json.length) {
      return rej()
    }
    
    chrome.storage.sync.set(Object.fromEntries(fragments.map((v, i) => [`${keyPrefix}${i}`, v])), () => {
      if (chrome.runtime.lastError) { 
        rej()
      } {
        res() 
      }
    })
  })
}

export function downloadSync<T>(keyPrefix: string, fragmentCount = 10): Promise<T> {
  return new Promise((res, rej) => {

    const keys = Array(fragmentCount).fill(0).map((v, i) => `${keyPrefix}${i}`)
    chrome.storage.sync.get(keys, items => {
      if (chrome.runtime.lastError) {
        return rej()
      }
      let fragments: string[] = []
      for (let key of keys) {
        const value = items[key] 
        if (value == null) break 
        fragments.push(value || "")
      }
      if (!fragments.length) {
        return res(null)
      }
      
      let data: any 
      try {
        data = JSON.parse("".concat(...fragments))
      } catch (err) {
        return rej()
      }
      res(data)
    })
  })
}
