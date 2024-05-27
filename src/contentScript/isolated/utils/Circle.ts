import { CircleInit } from "src/types";
import { Popover, autoInsertRules, deleteSheet, insertRules } from "./Popover";
import { fetchView, pushView } from "src/utils/state";
import { conformSpeed, formatSpeed } from "src/utils/configUtils";
import { Indicator } from "./Indicator";
import { between, clamp, extractClient, formatDuration, inverseLerp, isMobile, lerp, roundTo, timeout } from "src/utils/helper";
import { seekTo, setPause } from "./applyMediaEvent";
import debounce from "lodash.debounce";

const MIN_TO_ACTIVATE = 50
const MIN_STRONG = 115
const DELAY = 300

export class Circle extends Popover {
    released = false 
    circle = document.createElement("div")
    ref = document.createElement("div")
    delete = document.createElement("div")
    alreadyRan?: string 
    size = 45 
    x = 20
    y = 50  
    opacity = 0.5
    visibleOpacity = 0.8
    autoHide = true 
    indicator = new Indicator()
    video?: HTMLVideoElement
    downAt: number 
    leftCircle?: boolean
    movingMode?: boolean
    preventSecond?: boolean
    direction: Direction
    directionalIntervalId: number 
    combo: {
        combo: number,
        initialTime: number 
    }
    strong = true 
    hidden = true  
    hiddenTimeout: number 
    conflictWithDelete = false 
    constructor(private init: CircleInit) {
        super(true)
        this.init = init || {}
        this.x = this.init.circleInitial?.x ?? this.x
        this.y = this.init.circleInitial?.y ?? this.y
        this.autoHide = !this.init.autoHideDisabled
        this.size = this.init.circleSize ?? this.size
        this.opacity = this.init.opacity ?? this.opacity

        let shadowScalar =  lerp(1.6, 0.8, clamp(0, 1, inverseLerp(0, 100, this.size)))
        if (this.size < 10) shadowScalar *= 4
        let spread = this.size / 18 * shadowScalar
        let blur = spread * 2
        
        this.indicator.setInit({position: 'C', rounding: 3, scaling: 1.3, showShadow: true})
        this.circle.className = "circle"
        this.ref.className = "ref"
        this.delete.className = "delete"
        this.delete.textContent = "X"
        this.div.appendChild(this.circle)
        this.div.appendChild(this.ref)
        this.div.appendChild(this.delete)


        insertRules([
`#${this.id}${this.supportsPopover ? ':popover-open' : '.popoverOpenYah'} {
    background-color: transparent;
    position: fixed;
    left: 0px;
    top: 0px;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    user-select: none;
    touch-action: none;
    margin: 0px;
    border: none;
    transition: 300ms ease-in opacity;
}`, 
`.circle, .ref, .delete {
    position: fixed; 
    border-radius: 50%;
    box-sizing: border-box;
    user-select: none; 
    transition: transform 50ms ease-out, border-color 100ms ease-out, opacity 100ms ease-out;
}`,
`.circle, .ref {
    background-color: white;
}`,
`.delete {
    background-color: black;
    color: white;
    left: calc(50vw - 30px);
    top: calc(50vh + 60px);
    display: none;
    width: 60px;
    height: 60px;
    overflow: hidden;
    font-size: 30px;
    padding: 20px 0;
    text-align: center;
    opacity: 0.75;
}`,
`.circle {
    background-color: white;
    pointer-events: all;
    border: 5px solid white;
    box-shadow:  #00000088 0px 0px ${blur}px ${spread}px;
    width: ${this.size}px;
    height: ${this.size}px;
    z-index: 3;
}`,
`.ref {
    pointer-events: none;
    display: none;
    z-index: 2;
    width: ${this.size * 0.5}px;
    height: ${this.size * 0.5}px;
}`
], this.shadow)
        
        this.x = this.init.circleInitial?.x ?? this.x
        this.y = this.init.circleInitial?.y ?? this.y
        this.drawPosition()
        this.drawCircleOpacity()
        gvar.os.mediaTower.reobserveAllVideos()
        this.autoHide ? this.makeHidden() : this.makeVisible()
    }
    release = () => {
        this.stop()
        this._release() 
        this.indicator?.release(); delete this.indicator
    }
    start = (video: HTMLVideoElement) => {
        if (this.video) {
            if (this.video === video) return 
            this.stop()
        }
        this.video = video 
        gvar.os.eListen.pointerDownCbs.add(this.handlePointerDown)
        gvar.os.eListen.pointerUpCbs.add(this.handlePointerUp)
        gvar.os.eListen.touchEndCbs.add(this.handlePointerUp)
        gvar.os.eListen.pointerMoveCbs.add(this.handlePointerMove)
        gvar.os.eListen.touchMoveCbs.add(this.handlePointerMove)
        gvar.os.eListen.contextMenuCbs.add(this.handleContextMenu)

        gvar.os.eListen.touchStartCbs.add(this.handleGuard)
        gvar.os.eListen.touchEndCbs.add(this.handleGuard)
        gvar.os.eListen.touchMoveCbs.add(this.handleGuard)
        gvar.os.eListen.mouseDownCbs.add(this.handleGuard)
        gvar.os.eListen.mouseUpCbs.add(this.handleGuard)
        gvar.os.eListen.mouseMoveCbs.add(this.handleGuard)
        gvar.os.eListen.clickCbs.add(this.handleGuard)
        gvar.os.eListen.dblClickCbs.add(this.handleGuard)
        this.update(true)
    }
    stop = () => {
        if (!this.video) return 
        this.clearSession()
        clearTimeout(this.hiddenTimeout); delete this.hiddenTimeout
        delete this.video
        this.update(false)
        gvar.os.eListen.pointerDownCbs.delete(this.handlePointerDown)
        gvar.os.eListen.pointerUpCbs.delete(this.handlePointerUp)
        gvar.os.eListen.touchEndCbs.delete(this.handlePointerUp)
        gvar.os.eListen.pointerMoveCbs.delete(this.handlePointerMove)
        gvar.os.eListen.touchMoveCbs.delete(this.handlePointerMove)
        gvar.os.eListen.contextMenuCbs.delete(this.handleContextMenu)

        gvar.os.eListen.touchStartCbs.delete(this.handleGuard)
        gvar.os.eListen.touchEndCbs.delete(this.handleGuard)
        gvar.os.eListen.touchMoveCbs.delete(this.handleGuard)
        gvar.os.eListen.mouseDownCbs.delete(this.handleGuard)
        gvar.os.eListen.mouseUpCbs.delete(this.handleGuard)
        gvar.os.eListen.mouseMoveCbs.delete(this.handleGuard)
        gvar.os.eListen.clickCbs.delete(this.handleGuard)
        gvar.os.eListen.dblClickCbs.delete(this.handleGuard)
    }
    startHiddenTimeout = (show?: boolean) => {
        show === true && this.makeVisible()
        show === false && this.makeHidden()
        clearTimeout(this.hiddenTimeout)
        this.hiddenTimeout = setTimeout(this.makeHidden, 5_000)
    }
    makeHidden = () => {
        this.hidden = true 
        this.div.style.opacity = "0"
    }
    makeVisible = () => {
        this.hidden = false 
        this.div.style.opacity = "1"
    }
    clearPreventSecond = () => {
        delete this.preventSecond
    }
    preventDefault = (e: Event) => {
        this.preventSecond = true 
        e.cancelable && e.preventDefault()
        e.stopImmediatePropagation()
        setTimeout(this.clearPreventSecond)
    }
    handleGuard = (e: MouseEvent | TouchEvent) => {
        if (this.preventSecond || this.downAt) {
            e.cancelable && e.preventDefault()
            e.stopImmediatePropagation()
        }
    }
    handlePointerDown = (e: PointerEvent) => {
        this.autoHide && this.startHiddenTimeout(true)
        if (this.downAt) this.clearSession()
        if (this.isAtCircle(extractClient(e))) {
            this.downAt = Date.now() 
            this.drawCircleOpacity()
            this.div.style.pointerEvents = "all !important"
            this.preventDefault(e)
        } 
    }
    handlePointerUp = (e: PointerEvent | TouchEvent) => {
        if (!this.downAt) return 
        if (e instanceof PointerEvent && e.pointerType !== "mouse") {
            this.preventDefault(e)
            return
        }
        this.autoHide && this.startHiddenTimeout(true)
        this.preventDefault(e)
        
        if (!this.movingMode && !this.leftCircle) {
            this.togglePause()
        }
        this.clearSession()
    }
    handlePointerMove = async (e: PointerEvent | TouchEvent) => {
        this.autoHide && this.startHiddenTimeout(true)
        if (!this.downAt) return 
        if (e instanceof PointerEvent && e.pointerType !== "mouse") {
            this.preventDefault(e)
            return
        }
        this.preventDefault(e)
        
        let { clientX, clientY } = extractClient(e)

        if (this.movingMode) {
            this.x = clientX / window.innerWidth * 100
            this.y = clientY / window.innerHeight * 100
            if (this.isAtDelete({clientX, clientY})) {
                pushView({override: {circleWidget: false}, tabId: gvar.tabInfo.tabId})
                setNewPosition.cancel()
                return 
            }
            this.drawPosition()
            setNewPosition(this.x, this.y, this.size)
            return 
        }

        if (this.isAtCircle({clientX, clientY})) {
            this.clearDirectional()
            return 
        } 
        this.leftCircle = true 
        let direction = this.getDirection(clientX, clientY)
        direction ? this.startDirectional(direction) : this.clearDirectional()
    }
    handleContextMenu = (e: MouseEvent) => {
        this.autoHide && this.startHiddenTimeout(true)
        if (this.isAtCircle(extractClient(e))) {
            this.activateMovingMode()
            e.cancelable && e.preventDefault()
            e.stopImmediatePropagation()
        }
    }
    clearSession = () => {
        this.div.style.pointerEvents = "none"
        this.clearDirectional()
        this.clearMovingMode()
        delete this.downAt       
        this.drawCircleOpacity()
    }
    isAtCircle = (xy: ReturnType<typeof extractClient>) => {
        if (this.hidden) return 
        let { clientX, clientY } = xy 
        let x = this.x * 0.01 * window.innerWidth
        let y = this.y * 0.01 * window.innerHeight
        let aura = Math.max(this.size * (isMobile() ? 1.5 : 1.1 ), 30)

        if (
            between(x - aura * 0.5, x + aura * 0.5, clientX) && 
            between(y - aura * 0.5, y + aura * 0.5, clientY)
        ) return true 
        
    }
    isAtDelete = (xy: ReturnType<typeof extractClient>, large?: boolean) => {
        let size = large ? 120 : 60
        let x = window.innerWidth * 0.5 - size / 2
        let y = window.innerHeight * (this.conflictWithDelete ? 0.7 : 0.5) + 90 - size / 2

        if (
            between(x, x + size, xy.clientX) && 
            between(y, y + size, xy.clientY)
        ) return true 
    }
    togglePause = async () => {
        let paused = !this.video.paused
        setPause(this.video, paused ? 'on' : 'off')
    }
    handleDirectionalInterval = async () => {
        if (!this.combo) this.clearDirectional() 
        this.autoHide && this.startHiddenTimeout(true)
        this.combo.combo++
        let isVertical = this.direction === Direction.TOP || this.direction === Direction.BOTTOM
        let isNegative = this.direction === Direction.LEFT || this.direction === Direction.TOP
        this.circle.style.transform = `translate${(isVertical) ? 'Y' : 'X'}(${(isNegative) ? '-' : ''}${this.strong ? '40' : '20'}px)`
        this.circle.style.border = this.strong ? '5px solid red' : '5px solid white'
        this.ref.style.display = "block"

        if (isVertical) {
            let delta = this.strong ? 0.25 : 0.1
            const view = await fetchView({speed: true, lastSpeed: true}, gvar.tabInfo.tabId)
            let speed = conformSpeed(roundTo(view.speed + (this.direction === Direction.TOP ? delta : -delta), delta))
            pushView({override: {speed, latestViaShortcut: false, lastSpeed: view.speed}, tabId: gvar.tabInfo.tabId})
            this.indicator.show({text: formatSpeed(speed)})
        } else {
            let delta = this.strong ? 30 : 10
            if (this.combo.combo > 3) {
                delta *= 1.2 ** this.combo.combo
            }
            seekTo(this.video, this.video.currentTime + (this.direction === Direction.LEFT ? -delta : delta))
            this.indicator.show({text: formatDuration(this.video.currentTime - this.combo.initialTime, true)})
        }
    }
    getDirection = (clientX: number, clientY: number): Direction => {
         let originX = (this.x / 100) * window.innerWidth
         let originY = (this.y / 100) * window.innerHeight
         const deltaX = clientX - originX
         const deltaY = clientY - originY

         const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2)
         if (distance < MIN_TO_ACTIVATE) return
         this.strong = distance > MIN_STRONG
         
         return (Math.abs(deltaX) > Math.abs(deltaY)) ? (deltaX >= 0 ? Direction.RIGHT : Direction.LEFT) : (deltaY >= 0 ? Direction.BOTTOM : Direction.TOP)
    }
    clearDirectional = () => {
        if (this.direction) {
            delete this.combo
            delete this.direction
            delete this.leftCircle
            this.circle.style.transform = ''
            this.circle.style.border = '5px solid white'
            this.ref.style.display = 'none'
            clearInterval(this.directionalIntervalId); delete this.directionalIntervalId
        }
    }
    startDirectional = (direction: Direction) => {
        if (direction && this.direction !== direction) {
            this.clearDirectional()
            this.direction = direction 
            this.combo = {combo: 0, initialTime: this.video.currentTime}
            this.directionalIntervalId = setInterval(this.handleDirectionalInterval, DELAY)
            this.handleDirectionalInterval()
        }
    }
    activateMovingMode = () => {
        if (this.movingMode) return 
        this.indicator.show({text: 'Positioning', duration: 2000})
        this.movingMode = true 
        this.conflictWithDelete = this.isAtDelete({clientX: this.x / 100 * window.innerWidth, clientY: this.y / 100 * window.innerHeight}, true)
        this.circle.style.border = "5px solid yellow"
        this.delete.style.display = "block"
        this.delete.style.top = this.conflictWithDelete ? `calc(70vh + 60px)` : null
    }
    clearMovingMode = () => {
        if (!this.movingMode) return 
        this.indicator.show({text: 'Standard', duration: 2000})
        this.movingMode = false 
        this.conflictWithDelete = false 
        this.circle.style.border = "5px solid white"
        this.delete.style.display = "none"
    }
    drawPosition = () => {
        this.circle.style.left = `calc(${this.x}vw - ${this.size / 2}px)`
        this.circle.style.top = `calc(${this.y}vh - ${this.size / 2}px)`
        this.ref.style.left = `calc(${this.x}vw - ${this.size / 4}px)`
        this.ref.style.top = `calc(${this.y}vh - ${this.size / 4}px)`
    }
    drawCircleOpacity = () => {
        this.circle.style.opacity = this.downAt ? `${this.visibleOpacity}` : `${this.opacity}`
    }
}

enum Direction {
    TOP = 1,
    RIGHT,
    BOTTOM,
    LEFT
}

function conformCircle(x: number, y: number, size: number) {
    if (!window.innerWidth) return {x, y}
    let minWidth = size / window.innerWidth * 100 * 2
    let minHeight = size / window.innerHeight * 100 * 2
    return {
        x: clamp(minWidth, 100 - minWidth, x), 
        y: clamp(minHeight, 100 - minHeight, y)
    }
}

const setNewPosition = debounce(async (x: number, y: number, size: number) => {
    let circleInit = (await fetchView({circleInit: true})).circleInit || {}
    circleInit.circleInitial = conformCircle(x, y, size)
    await pushView({override: {circleInit}, tabId: gvar.tabInfo.tabId})
}, 2000, {trailing: true})
