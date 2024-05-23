import { isFirefox, randomId } from "src/utils/helper"
import { getReal } from "src/utils/nativeUtils"

export class Popover {
    wrapper?: HTMLDivElement
    shadow?: ShadowRoot
    div = document.createElement('div')
    main?: HTMLDivElement

    shouldShow = false 
    id = `d${randomId()}`
    styleLocation?: HTMLElement | ShadowRoot
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
    }
    update = (show?: boolean) => {
        if (show != null) this.shouldShow = show 
        if (this.shouldShow) {
            document.documentElement.appendChild(this.main)
            !this.div.togglePopover() && this.div.togglePopover()
        } else {
            this.main.isConnected && this.main.remove()
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


export function insertRules(rules: string[], document: DocumentOrShadowRoot, disabled = false) {
    let sheet = new CSSStyleSheet();
    sheet.disabled = disabled 
    for (let rule of rules) {
        sheet.insertRule(rule)
    }
    getReal(document.adoptedStyleSheets).push(sheet)
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
