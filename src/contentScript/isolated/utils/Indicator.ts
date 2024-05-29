import { createOverlayIcons } from "src/defaults/icons";
import { Popover } from "./Popover";
import { insertStyle } from "src/utils/nativeUtils";
import { IndicatorInit } from "src/types";
import { INDICATOR_INIT } from "src/defaults";
import styles from "./Indicator.css?raw"

const BASE_FONT_SIZE = 30 
const BASE_PADDING = 10 
const BASE_BORDER_RADIUS = 10
const SMALL_SCALING = 0.83
const BASE_OFFSET = 30 

export class Indicator extends Popover {
    icons = createOverlayIcons()
    scaling = 1
    duration = 1 
    animation = 1
    timeoutId: number

    constructor() {
        super()
        insertStyle(styles, this._shadow)
    }
    setInit = (init: IndicatorInit) => {
        init = init || {}

        this._div.removeAttribute('style')
        this._div.style.backgroundColor = init.backgroundColor || INDICATOR_INIT.backgroundColor
        this._div.style.color = init.textColor || INDICATOR_INIT.textColor
        if (init.showShadow) this._div.style.boxShadow = `1px 1px 35px 3px #ffffff88`

        this.animation = init.animation || 1 
        this.duration = init.duration ?? 1
        this.scaling = init.scaling ?? INDICATOR_INIT.scaling
        const rounding = (init.rounding ?? INDICATOR_INIT.rounding) * this.scaling
    
        this._div.style.padding = `${BASE_PADDING * (this.scaling + rounding * 0.12)}px`
        this._div.style.fontSize = `${BASE_FONT_SIZE * this.scaling}px`
        this._div.style.borderRadius = rounding ? `${BASE_BORDER_RADIUS * rounding}px` : "0px"

        const position = init.position ?? "TL"
        
        if (position === 'C') {
            if (this._supportsPopover) {
                this._div.style.position = "static" 
                this._div.style.inset = "revert"
            } else {
                this._div.style.left = `50vw`
                this._div.style.top = `50vh`
            }
            return 
        } 
        
        let offset = BASE_OFFSET * (init.offset ?? 1)
        const isTop = position.includes('T')
        const isLeft = position.includes('L')
        this._div.style.position = 'fixed'
        this._div.style.inset = 'unset'

        this._div.style[isTop ? 'top' : 'bottom'] = `${offset}px`
        this._div.style[isLeft ? 'left' : 'right'] = `${offset}px`
    }
    release = () => {
        delete this.icons
        clearTimeout(this.timeoutId)
        this._release()
    }
    show = (opts: IndicatorShowOpts) => {
        clearTimeout(this.timeoutId)
        this._div.innerText = opts.preText || "";
        (opts.icons || []).forEach(v => {
            this._div.appendChild(this.icons[v])
        })
        this._div.append(opts.text || "")

        const duration = (opts.duration ?? 900) * this.duration

        let size = `${(opts.small ? BASE_FONT_SIZE * SMALL_SCALING : BASE_FONT_SIZE) * this.scaling}px`
        let animation = ''
        if (!(opts.static || this.animation === 2)) {
            animation = `keyframe_${this.animation} ${duration}ms ease-in forwards`
        } 
        this._div.style.animation = animation
        
        this._div.style.fontSize = opts.fontSize ?? size 
        this._wrapper.remove()
        this._update(true)

        this.timeoutId = setTimeout(() => {
            this._update(false)
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

