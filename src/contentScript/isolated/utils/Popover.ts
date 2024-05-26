import { isFirefox, randomId } from "src/utils/helper"
import { getReal } from "src/utils/nativeUtils"

export class Popover {
    wrapper?: HTMLDivElement
    shadow?: ShadowRoot
    div = document.createElement('div')
    main?: HTMLDivElement
    supportsPopover = !!this.div.togglePopover

    shouldShow = false 
    id = `d${randomId()}`
    styleLocation?: HTMLElement | ShadowRoot
    _sheet?: StyleSheet
    constructor(useShadow?: boolean) {
        if (useShadow) {
            this.wrapper = document.createElement('div')
            this.shadow = this.wrapper.attachShadow({mode: "open"})
            this.shadow.appendChild(this.div)
            this.main = this.wrapper
            this.styleLocation = this.shadow
        } else {
            this.main = this.div 
            this.styleLocation = document.documentElement
        }

        this.div.popover = 'manual'
        this.div.id = this.id 
        this.div.style.zIndex = "99999999999"
        gvar.os?.eListen.fsCbs.add(this.handleFsChange)
        
        if (!this.supportsPopover) {
            this._sheet = insertRules([
                `#${this.id} {
                    z-index: 99999999999;
                    display: none;
                }`,
                `#${this.id}.popoverOpenYah {
                    display: block !important;
                }`
        ], this.shadow ?? document)
        }
    }
    update = (show?: boolean) => {
        if (show != null) this.shouldShow = show 
        if (this.shouldShow) {
            document.documentElement.appendChild(this.main)
            if (this.supportsPopover) {
                !this.div.togglePopover() && this.div.togglePopover()
            } else {
                this.div.classList.add("popoverOpenYah")
            }
        } else {
            this.main.isConnected && this.main.remove()
            this.div.classList.remove("popoverOpenYah")
        }
    }
    _release = () => {
        gvar.os?.eListen.fsCbs.delete(this.handleFsChange)
        this.main.remove()
        delete this.div 
        delete this.id 
    }
    handleFsChange = () => {
        document.fullscreenElement && this.update()
    }
}


export function insertRules(rules: string[], doc: DocumentOrShadowRoot, disabled = false) {
    let sheet = new CSSStyleSheet();
    sheet.disabled = disabled 
    for (let rule of rules.filter(v => v)) {
        sheet.insertRule(rule)
        try {
        } catch { }
    }
    getReal(doc.adoptedStyleSheets).push(sheet)
    return sheet 
}

export function deleteSheet(sheet: CSSStyleSheet, document: DocumentOrShadowRoot) {
    let real = getReal(document.adoptedStyleSheets)
    let idx = real.findIndex(s => s === sheet)
    if (idx >= 0) {
        real.splice(idx, 1)
        return true 
    }
}

export function autoInsertRules(rules: string[], fallbackDocument: DocumentOrShadowRoot) {
    if (isFirefox()) {
        return insertRules(rules, fallbackDocument) 
    }
    chrome.runtime.sendMessage({type: 'INSERT_CSS', value: rules.join("")} as Messages)
}
