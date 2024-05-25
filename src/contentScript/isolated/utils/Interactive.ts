import { between, clamp, extractClient, inverseLerp, lerp } from "src/utils/helper";
import { Popover, insertRules } from "./Popover";
import { ItcInit } from "src/types";
import { requestApplyMediaEvent } from "./applyMediaEvent";
import { createElement as m } from "src/utils/helper"

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
    init: ItcInit
    slider = document.createElement('div')
    ref = document.createElement('div')
    cancelButton = m(`<button class="cancel"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M5.72 5.72a.75.75 0 0 1 1.06 0L12 10.94l5.22-5.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L13.06 12l5.22 5.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L12 13.06l-5.22 5.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L10.94 12 5.72 6.78a.75.75 0 0 1 0-1.06Z"></path></svg></button>`) as HTMLButtonElement
    resetButton = m(`<button class="reset"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke-width="2" d="M20,8 C18.5974037,5.04031171 15.536972,3 12,3 C7.02943725,3 3,7.02943725 3,12 C3,16.9705627 7.02943725,21 12,21 L12,21 C16.9705627,21 21,16.9705627 21,12 M21,3 L21,9 L15,9"></path></svg></button>`) as HTMLButtonElement
    constructor() {
        super(true)
        this.ref.className = 'ref'
        this.slider.className = 'slider'

        this.div.appendChild(this.ref)
        this.div.appendChild(this.slider)
        this.div.appendChild(this.cancelButton)
        this.div.appendChild(this.resetButton)
    

        insertRules([`
            #${this.id}:popover-open {
                background-color: transparent;
                position: fixed;
                left: 0px;
                top: 0px;
                width: 100vw;
                height: 100vh;
                border: none;
                margin: 0;
                user-select: none;
                touch-action: none;
                pointer-events: all !important;

                & > .slider, & > .ref {
                    pointer-events: none;
                    left: 0px;
                    position: fixed; 
                    border: 1px solid #00000066;
                }
                
                & > .slider {
                    height: ${SLIDER_HEIGHT}px;
                    top: calc(50vh - ${SLIDER_HEIGHT * 0.5}px);
                    pointer-events: none;
                    width: ${SLIDER_WIDTH}px;
                    background-color: blue;
                    border-radius: 50%;
                    display: ${SLIDER_SHOW ? 'block' : 'none'};
                }
                & > .ref {
                    height: ${REF_HEIGHT}px;
                    top: calc(50vh - ${REF_HEIGHT * 0.5}px);
                    width: ${REF_WIDTH}px;
                    background-color: #ff0000;
                    border-radius: 50%;
                    display: ${REF_SHOW ? 'block' : 'none'};
                    opacity: 0.8;
                }

                & > .cancel, & > .reset {
                    position: fixed;
                    box-sizing: border-box;
                    font-size: 55px;
                    line-height: 1;
                    bottom: calc(10vh - 52px);
                    background-color: black;
                    box-shadow: 1px 1px 40px 4px white;
                    border-radius: 50%;
                    color: white;
                    opacity: 0.8;
                    padding: 25px;

                    &:hover {
                        opacity: 1;
                    }
                }
                
                & > .cancel {
                    right: calc(10vw - 52px);
                }
                
                & > .reset {
                    left: calc(10vw - 52px);
                    display: none;
                }
            }
        `], this.shadow)
    }
    released = false 
    release = () => { 
        this.stop()
        this._release()
    }
    start = (init: ItcInit) => {
        this.init = init 
        this.ref.style.transform = `translateX(calc((100vw - ${2 * BLEEDING}px) * ${init.relative ? 0.5 : inverseLerp(init.sliderMin, init.sliderMax, init.original)} + ${BLEEDING}px - ${REF_WIDTH * 0.5}px))`
        this.resetButton.style.display = init.resetTo == null ? 'none' : 'inline-block'
        !init.wasPaused && init.kb.pauseWhileScrubbing && init.kb.command === "seek" && requestApplyMediaEvent(init.mediaTabInfo.tabId, init.mediaTabInfo.frameId, init.mediaKey, {type: "PAUSE", state: "on"})
        this.update(true)
        
        init.dontReleaseKeyUp || gvar.os.eListen.keyUpCbs.add(this.handleKeyUp)
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
        let init = this.init
        !init.wasPaused && init.kb.pauseWhileScrubbing && init.kb.command === "seek" && requestApplyMediaEvent(init.mediaTabInfo.tabId, init.mediaTabInfo.frameId, init.mediaKey, {type: "PAUSE", state: "off"})
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
        this.update(false)
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
        if (this.init.resetTo == null) return 
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
        const init = this.init
        const normal = clamp(0, 1, (xy.clientX - BLEEDING) / (window.innerWidth - 2 * BLEEDING))
        const dry = init.seekOnce && !final

        if (init.relative) {
            this.send((normal * 2 - 1) * init.step, true, dry)
        } else {
            const newValue = lerp(init.sliderMin, init.sliderMax, normal)
            this.send(newValue, false, dry)
        }

        if (SLIDER_SHOW) this.slider.style.transform = `translateX(calc((100vw - ${2 * BLEEDING}px) * ${normal} + ${BLEEDING}px - ${SLIDER_WIDTH * 0.5}px))`

        return 
    }
    cancel = () => {
        this.send(0, true)
        this.stop()
    }
    reset = () => {
        this.init.resetTo != null && this.send(this.init.resetTo)
        this.stop()
    }
    send = (newValue: number, relative?: boolean, dry?: boolean) => {
        let init = this.init
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