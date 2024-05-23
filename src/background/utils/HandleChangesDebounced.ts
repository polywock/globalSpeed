import debounce from "lodash.debounce"
import type { DebouncedFunc, DebounceSettingsLeading } from "lodash"

type HandleChangesFunction = (changes: chrome.storage.StorageChanges) => void

export class HandleChangesDebounced {
    private changes: chrome.storage.StorageChanges = {}
    private wrapDeb: DebouncedFunc<typeof HandleChangesDebounced.prototype.wrap>
    released = false 
    constructor(public rawHandler: HandleChangesFunction, wait: number, init?: DebounceSettingsLeading) {
        this.wrapDeb = debounce(this.wrap, wait, init)
    }
    release = () => {
        if (this.released) return 
        this.released = true 
        this.wrapDeb?.cancel()
        delete this.wrapDeb
    }
    private consume = () => {
        let changes = this.changes
        this.changes = {}
        return changes 
    }
    private wrap = () => {
        this.rawHandler(this.consume())
    }
    public handler = (changes: chrome.storage.StorageChanges) => {
        for (let key in changes) {
            if (this.changes[key]) {
                this.changes[key] = {oldValue: this.changes[key].oldValue, newValue: changes[key].newValue}
            } else {
                this.changes[key] = changes[key]
            }
        }
        this.wrapDeb()
    }
}
