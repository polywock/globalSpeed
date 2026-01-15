import { between, clamp, extractClient, inverseLerp, lerp } from "src/utils/helper";
import { Popover } from "./Popover";
import { insertStyle } from "src/utils/nativeUtils";
import { ItcInit } from "src/types";
import { requestApplyMediaEvent } from "./applyMediaEvent";
import { createElement as m } from "src/utils/helper"
import styles from "./Interactive.css?raw"
import { crossIcon, resetIcon } from "src/defaults/icons"

const SLIDER_WIDTH = 100
const SLIDER_HEIGHT = 100 
const SLIDER_SHOW = false 

const REF_WIDTH = 10
const REF_HEIGHT = 10 
const REF_SHOW = true 

const BLEEDING = 50

export class Interactive extends Popover {
    lastDraw = -Infinity
    latestXy: ReturnType<typeof extractClient>
    inits: ItcInit[]
    sole: ItcInit
    slider = document.createElement('div')
    ref = document.createElement('div')
    cancelButton = m(`<button class="cancel">${crossIcon}</button>`) as HTMLButtonElement
    resetButton = m(`<button class="reset">${resetIcon}</button>`) as HTMLButtonElement
    paused = false 
    isShowingReset = false 
    constructor() {
        super()
        this.ref.className = 'ref'
        this.slider.className = 'slider'

        this._div.appendChild(this.ref)
        this._div.appendChild(this.slider)
        this._div.appendChild(this.cancelButton)
        this._div.appendChild(this.resetButton)
    

        insertStyle(styles, this._shadow)

        this.slider.style.top = `calc(50vh - ${SLIDER_HEIGHT * 0.5}px)`
        this.slider.style.height = `${SLIDER_HEIGHT}px`
        this.slider.style.width = `${SLIDER_WIDTH}px`
        this.slider.style.display = `${SLIDER_SHOW ? 'block' : 'none'}`

        this.ref.style.top = `calc(50vh - ${REF_HEIGHT * 0.5}px)`
        this.ref.style.height = `${REF_HEIGHT}px`
        this.ref.style.width = `${REF_WIDTH}px`
        this.ref.style.display = `${REF_SHOW ? 'block' : 'none'}`
    }
    released = false 
    release = () => { 
        this.stop()
        this._release()
    }
    start = (inits: ItcInit[]) => {
        this.paused = false 
        this.inits = inits
        this.sole = this.inits.length === 1 ? this.inits[0] : undefined
        if (!this.inits.length) return 
        if (this.sole) {
            this.ref.style.transform = `translateX(calc((100vw - ${2 * BLEEDING}px) * ${this.sole.relative ? 0.5 : inverseLerp(this.sole.sliderMin, this.sole.sliderMax, this.sole.original)} + ${BLEEDING}px - ${REF_WIDTH * 0.5}px))`
            this.ref.style.display = "block"
        } else {
            this.ref.style.display = "none"
        }
        
        this.isShowingReset = this.inits.every(init => init.resetTo != null)
        this.resetButton.style.display = this.isShowingReset ? 'inline-block' : 'none'
        if (this.inits.some(init => init.kb.command === "seek" && !init.wasPaused && init.kb.pauseWhileScrubbing)) {
            let init = this.inits.find(init => init.mediaKey)
            requestApplyMediaEvent(init.mediaTabInfo.tabId, init.mediaTabInfo.frameId, init.mediaKey, {type: "PAUSE", state: "on"})
            this.paused = true 
        }
        this._update(true)
        
        this.inits.some(init => init.dontReleaseKeyUp) || gvar.os.eListen.keyUpCbs.add(this.handleKeyUp)
        gvar.os.eListen.pointerMoveCbs.add(this.handlePointerMove)
        gvar.os.eListen.pointerUpCbs.add(this.handlePointerUp)
        gvar.os.eListen.touchMoveCbs.add(this.handlePointerMove)
        gvar.os.eListen.touchEndCbs.add(this.handlePointerUp)

        gvar.os.eListen.touchStartCbs.add(this.handleGuard)
        gvar.os.eListen.touchEndCbs.add(this.handleGuard)
        gvar.os.eListen.touchMoveCbs.add(this.handleGuard)
        gvar.os.eListen.mouseDownCbs.add(this.handleGuard)
        gvar.os.eListen.mouseUpCbs.add(this.handleGuard)
        gvar.os.eListen.mouseMoveCbs.add(this.handleGuard)
        gvar.os.eListen.clickCbs.add(this.handleGuard)
        gvar.os.eListen.dblClickCbs.add(this.handleGuard)
    }
    stop = () => {
        if (this.paused) {
            let init = this.inits.find(init => init.mediaKey)
            requestApplyMediaEvent(init.mediaTabInfo.tabId, init.mediaTabInfo.frameId, init.mediaKey, {type: "PAUSE", state: "off"})
            this.paused = false 
        }
        
        delete this.latestXy
        gvar.os.eListen.keyUpCbs.delete(this.handleKeyUp)
        gvar.os.eListen.pointerMoveCbs.delete(this.handlePointerMove)
        gvar.os.eListen.pointerUpCbs.delete(this.handlePointerUp)
        gvar.os.eListen.touchMoveCbs.delete(this.handlePointerMove)
        gvar.os.eListen.touchEndCbs.delete(this.handlePointerUp)

        gvar.os.eListen.touchStartCbs.delete(this.handleGuard)
        gvar.os.eListen.touchEndCbs.delete(this.handleGuard)
        gvar.os.eListen.touchMoveCbs.delete(this.handleGuard)
        gvar.os.eListen.mouseDownCbs.delete(this.handleGuard)
        gvar.os.eListen.mouseUpCbs.delete(this.handleGuard)
        gvar.os.eListen.mouseMoveCbs.delete(this.handleGuard)
        gvar.os.eListen.clickCbs.delete(this.handleGuard)
        gvar.os.eListen.dblClickCbs.delete(this.handleGuard)
        this._update(false)
    }
    handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            this.cancel()
            return 
        }

        this.latestXy && this.draw(this.latestXy, true)
        this.stop()
    }
    isAtCancel = (xy: ReturnType<typeof extractClient>) => {
        let b = this.cancelButton.getBoundingClientRect()
        if (!b.width) return 
        if (
            between(b.x, b.x + b.width, xy.clientX) && 
            between(b.y, b.y + b.height, xy.clientY)
        ) return true 
    }
    isAtReset = (xy: ReturnType<typeof extractClient>) => {
        if (!this.isShowingReset) return 
        let b = this.resetButton.getBoundingClientRect()
        if (!b.width) return 
        if (
            between(b.x, b.x + b.width, xy.clientX) && 
            between(b.y, b.y + b.height, xy.clientY)
        ) return true 
        
    }
    preventDefault = (e: Event) => {
        e.cancelable && e.preventDefault()
        e.stopImmediatePropagation()
    }
    handleGuard = (e: MouseEvent | TouchEvent) => {
        e.cancelable && e.preventDefault()
        e.stopImmediatePropagation()
    }
    handlePointerMove = (e: PointerEvent | TouchEvent) => {
        this.preventDefault(e)
        if (e instanceof PointerEvent && e.pointerType !== "mouse") {
            return
        }
        let xy = extractClient(e)
        if (this.isAtCancel(xy)) {
            this.cancel()
            return 
        }
        if (this.isAtReset(xy)) {
            this.reset()
            return 
        }
        this.latestXy = xy
        const now = Date.now()
        if ((now - this.lastDraw) < 200) return 
        this.draw(xy)
    }
    handlePointerUp = (e: PointerEvent | TouchEvent) => {
        if (e instanceof PointerEvent && e.pointerType !== "mouse") {
            this.preventDefault(e)
            return
        }
        this.latestXy = extractClient(e)
        if (this.latestXy.clientX != null) {
            this.draw(this.latestXy, true)
        }
        this.stop()
        this.preventDefault(e)
    }
    draw = (xy: ReturnType<typeof extractClient>, final?: boolean) => {
        const normal = clamp(0, 1, (xy.clientX - BLEEDING) / (window.innerWidth - 2 * BLEEDING))
        
        // const init = this.init
        for (let init of this.inits) {
            const dry = init.seekOnce && !final
            if (init.relative) {
                this.send(init, (normal * 2 - 1) * init.step, true, dry)
            } else {
                const newValue = lerp(init.sliderMin, init.sliderMax, normal)
                this.send(init, newValue, false, dry)
            }
        }
        
        if (SLIDER_SHOW) this.slider.style.transform = `translateX(calc((100vw - ${2 * BLEEDING}px) * ${normal} + ${BLEEDING}px - ${SLIDER_WIDTH * 0.5}px))`
        return 
    }
    cancel = () => {
        this.inits.forEach(init => {
            this.send(init, 0, true)            
        })
        this.stop()
    }
    reset = () => {
        if (!this.isShowingReset) return 
        for (let init of this.inits) {
            init.resetTo != null && this.send(init, init.resetTo)
        }
        this.stop()
    }
    send = (init: ItcInit, newValue: number, relative?: boolean, dry?: boolean) => {
        chrome.runtime.sendMessage({type: 'SET_STATEFUL', init: {
            mediaKey: init.mediaKey,
            mediaTabInfo: init.mediaTabInfo,
            tabInfo: gvar.tabInfo,
            shouldShow: init.shouldShow,
            value: init.original == null ? null : (relative ? (init.original + newValue) : newValue),
            valueAlt: init.originalAlt == null ? null : (relative ? (init.originalAlt + newValue) : newValue),
            kb: init.kb,
            dry,
            showAlt: true,
            wasRelative: init.relative,
            mediaDuration: init.mediaDuration
        }} as Messages)
    }
}


export type InteractiveOpts = {
    pauseWhileSeeking?: boolean,
    seekOnce?: boolean,
    relative?: number
}