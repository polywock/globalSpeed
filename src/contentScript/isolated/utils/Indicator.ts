import { createOverlayIcons } from "src/defaults/icons";
import { Popover, insertRules } from "./Popover";
import { randomId } from "src/utils/helper";
import { IndicatorInit } from "src/types";
import { INDICATOR_INIT } from "src/defaults";

const BASE_FONT_SIZE = 30 
const BASE_PADDING = 10 
const BASE_BORDER_RADIUS = 10
const SMALL_SCALING = 0.83
const BASE_OFFSET = 30 

export class Indicator extends Popover {
    keyFrameName = `d${randomId()}`
    icons = createOverlayIcons()
    scaling = 1
    duration = 1 
    animation = 1
    timeoutId: number

    constructor() {
        super(true)
        insertRules([
            `@keyframes ${this.keyFrameName}_1 {
                from { transform: scale(0.95); opacity: 1 }
                to { transform: scale(1.05); opacity: 0 }
            }`,

            `@keyframes ${this.keyFrameName}_3 {
                0% { transform: scale(1) }
                80% { transform: scale(0.75) }
                100% { transform: scale(0) }
            }`, 


            `@keyframes ${this.keyFrameName}_4 {
                0% { transform: scale(1) }
                60% { transform: scale(0.95) }
                90% { transform: scale(0.5); opacity: 0.5 }
                100% { transform: scale(1.2); opacity: 0 }
            }`,

            `@keyframes ${this.keyFrameName}_5 {
                0% { transform: scale(0.95) }
                30% { transform: scale(1.05) }
                100% { transform: scale(0) rotateZ(100deg); opacity: 0 }
            }`,
            `#${this.id}${this.supportsPopover ? ':popover-open' : '.popoverOpenYah'} {
                border: none;
                font-family: "Segoe UI", "Avenir", Courier, monospace;
                position: fixed;
                left: 20px;

                white-space: pre;
                grid-auto-flow: column;
                align-items: center;
                pointer-events: none;
                display: grid;
            }`
        ], this.shadow)
    }
    setInit = (init: IndicatorInit) => {
        init = init || {}

        this.div.removeAttribute('style')
        this.div.style.backgroundColor = init.backgroundColor || INDICATOR_INIT.backgroundColor
        this.div.style.color = init.textColor || INDICATOR_INIT.textColor
        if (init.showShadow) this.div.style.boxShadow = `1px 1px 35px 3px #ffffff88`

        this.animation = init.animation || 1 
        this.duration = init.duration ?? 1
        this.scaling = init.scaling ?? INDICATOR_INIT.scaling
        const rounding = (init.rounding ?? INDICATOR_INIT.rounding) * this.scaling
    
        this.div.style.padding = `${BASE_PADDING * (this.scaling + rounding * 0.12)}px`
        this.div.style.fontSize = `${BASE_FONT_SIZE * this.scaling}px`
        this.div.style.borderRadius = rounding ? `${BASE_BORDER_RADIUS * rounding}px` : "0px"

        const position = init.position ?? "TL"
        
        if (position === 'C') {
            if (this.supportsPopover) {
                this.div.style.position = "static" 
                this.div.style.inset = "revert"
            } else {
                this.div.style.left = `50vw`
                this.div.style.top = `50vh`
            }
            return 
        } 
        
        let offset = BASE_OFFSET * (init.offset ?? 1)
        const isTop = position.includes('T')
        const isLeft = position.includes('L')
        this.div.style.position = 'fixed'
        this.div.style.inset = 'unset'

        this.div.style[isTop ? 'top' : 'bottom'] = `${offset}px`
        this.div.style[isLeft ? 'left' : 'right'] = `${offset}px`
    }
    release = () => {
        delete this.icons
        clearTimeout(this.timeoutId)
        this._release()
    }
    show = (opts: IndicatorShowOpts) => {
        clearTimeout(this.timeoutId)
        this.div.innerText = opts.preText || "";
        (opts.icons || []).forEach(v => {
            this.div.appendChild(this.icons[v])
        })
        this.div.append(opts.text || "")

        const duration = (opts.duration ?? 900) * this.duration

        let size = `${(opts.small ? BASE_FONT_SIZE * SMALL_SCALING : BASE_FONT_SIZE) * this.scaling}px`
        let animation = ''
        if (!(opts.static || this.animation === 2)) {
            animation = `${this.keyFrameName}_${this.animation} ${duration}ms ease-in forwards`
        } 
        this.div.style.animation = animation
        
        this.div.style.fontSize = opts.fontSize ?? size 
        this.main.remove()
        this.update(true)

        this.timeoutId = setTimeout(() => {
            this.update(false)
            delete this.timeoutId
        }, duration * 1.2)
    }
}


export type IndicatorShowOpts = {
    preText?: string,
    text?: string, 
    duration?: number, 
    small?: boolean, 
    icons?: (keyof ReturnType<typeof createOverlayIcons>)[],
    static?: boolean,
    fontSize?: string
}

