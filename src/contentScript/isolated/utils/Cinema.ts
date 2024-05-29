import { clamp } from "src/utils/helper";
import { Popover } from "./Popover";
import { insertStyle } from "src/utils/nativeUtils";
import styles from "./Cinema.css?raw"

const BLEED = 1 
const PADDING = 5 

export class Cinema extends Popover {
    released = false 
    obs: IntersectionObserver
    roundness = 10
    currentBounds: DOMRect & {innerWidth: number, innerHeight: number}
    index = 0
    style: HTMLStyleElement
    static currentCinema: Cinema
    
    
    constructor(private video: HTMLElement, color: string, opacity: number, roundness: number) {
        super()
        Cinema.currentCinema?.release()
        Cinema.currentCinema = this 
        this._div.style.position = "fixed"
        this._div.style.margin = "0"
        this._div.style.left = "0px"
        this._div.style.top = "0px"
        this._div.style.width = "100vw"
        this._div.style.height = "100vh"
        this._div.style.border = "none"
        this._div.style.backgroundColor = color ?? "black"
        this._div.style.opacity = `${(opacity ?? 90) / 100}`
        this.roundness = roundness ?? this.roundness
        this.style = insertStyle(styles, document.documentElement)
        

        this.every()
        this._update(true)
        this._div.addEventListener("click", this.release)
    }
    every = () => {
        if (this.released) return 
        this.reposition()
        requestAnimationFrame(this.every)
    } 
    reposition = () => {
        this.index++ 
        const b = this.video.getBoundingClientRect()
        const height = clamp(0, window.innerHeight, b.top + b.height) - clamp(0, window.innerHeight, b.top)
        const width = clamp(0, window.innerWidth, b.left + b.width) - clamp(0, window.innerWidth, b.left)

        if ((this.video as HTMLMediaElement).ended || width < 150 || height < 150) return this.release()
        if (this.currentBounds && window.innerWidth === this.currentBounds.innerWidth && window.innerHeight === this.currentBounds.innerHeight && b.x === this.currentBounds.x && b.y === this.currentBounds.y && b.width === this.currentBounds.width && b.height === this.currentBounds.height) return 
        this.currentBounds = {...b, innerWidth: window.innerWidth, innerHeight: window.innerHeight} 

        if (document.fullscreenElement || (b.width / window.innerWidth > 0.95 && b.height / window.innerHeight > 0.95)) {
            this.release()
            return 
        }
        let top = b.y + BLEED
        let bottom = b.y + b.height - BLEED
        let left = b.x + BLEED
        let right = b.x + b.width - BLEED
        let radii = this.roundness 

        let xx = window.innerWidth
        let yy = window.innerHeight

        this._div.style.clipPath = `path("\
            M0,0V${yy}H${xx}V0H${xx / 2 - PADDING}V${top}\
            H${right - radii} A${radii},${radii},${0},${0},${1},${right},${top + radii}\
            V${bottom - radii} A${radii},${radii},${0},${0},${1},${right - radii},${bottom}\
            H${left + radii} A${radii},${radii},${0},${0},${1},${left},${bottom - radii}\
            V${top + radii} A${radii},${radii},${0},${0},${1},${left + radii},${top}\
            H${xx / 2 + PADDING}V0H0Z")`            
    }
   
    release = () => {
        if (this.released) return 
        this.released = true 
        this.style.remove()
        delete this.style
        this._release() 
        this.obs?.disconnect()
        delete this.obs
        if (Cinema.currentCinema === this) {
            delete Cinema.currentCinema
        }
    }
}

