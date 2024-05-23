import debounce from "lodash.debounce"

// Only runs on Edge split tabs to help determine pane focus. 
export class LatestFocus {
    constructor(public tabKey: string, public otherTabKey: string) {
      window.addEventListener("mousedown", this.handleFocus, true)
    }
    handleFocus = async () => {
      const res = await chrome.storage.local.get([this.tabKey, this.otherTabKey])
      if (res[this.tabKey] > (res[this.otherTabKey] || 0)) return
      chrome.storage.local.set({[this.tabKey]: Date.now()})
    }
    handleFocusDeb = debounce(this.handleFocus, 3000, {leading: true, trailing: true})
}
