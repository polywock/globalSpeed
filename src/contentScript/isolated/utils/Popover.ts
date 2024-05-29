import { insertStyle } from "src/utils/nativeUtils"
import styles from "./Popover.css?raw"

export class Popover {
    _wrapper: HTMLDivElement
    _shadow: ShadowRoot
    _div = document.createElement('div')
    _supportsPopover = !!this._div.togglePopover
    _shouldShow = false 
    _style?: HTMLStyleElement
    constructor() {
        this._wrapper = document.createElement('div')
        this._shadow = this._wrapper.attachShadow({mode: "closed"})
        this._shadow.appendChild(this._div)

        this._div.popover = 'manual'
        this._div.style.zIndex = "99999999999"
        gvar.os?.eListen.fsCbs.add(this._handleFsChange)
        
        if (!this._supportsPopover) {
            this._div.classList.add("popoverYah")


            this._style = insertStyle(styles, this._shadow)
        }
    }
    _update = (show?: boolean) => {
        if (show != null) this._shouldShow = show 
        if (this._shouldShow) {
            document.documentElement.appendChild(this._wrapper)
            if (this._supportsPopover) {
                !this._div.togglePopover() && this._div.togglePopover()
            } else {
                this._div.classList.add("popoverOpenYah")
            }
        } else {
            this._wrapper.isConnected && this._wrapper.remove()
            this._div.classList.remove("popoverOpenYah")
        }
    }
    _release = () => {
        gvar.os?.eListen.fsCbs.delete(this._handleFsChange)
        this._wrapper.remove()
        delete this._div 
    }
    _handleFsChange = () => {
        document.fullscreenElement && this._update()
    }
}


