import { CircleInit } from "src/types";
import { Popover } from "./Popover";
import { insertStyle } from "src/utils/nativeUtils";
import { fetchView, pushView } from "src/utils/state";
import { conformSpeed, formatSpeed } from "src/utils/configUtils";
import { Indicator } from "./Indicator";
import { between, clamp, extractClient, formatDuration, inverseLerp, isFirefoxMobile, isMac, isMobile, lerp, roundTo } from "src/utils/helper";
import { seekTo, setPause } from "./applyMediaEvent";
import debounce from "lodash.debounce";
import styles from "./Circle.css?raw"

const MIN_TO_ACTIVATE = 50
const MIN_STRONG = 115
const DELAY = isMobile() ? 450 : 350
const LONG_PRESS_MS = 600

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
    key: string 

    autoHidden = true
    autoHiddenTimeout: number 
    hidden = false 
    conflictWithDelete = false 
    clientWidth = this._div.clientWidth
    clientHeight = this._div.clientHeight
    longPressTimeoutId: number 
    addedOutStyle = false 
    constructor(private init: CircleInit) {
        super()
        this.init = init || {}
        this.key = this.init.key
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
        this._div.appendChild(this.circle)
        this._div.appendChild(this.ref)
        this._div.appendChild(this.delete)


        insertStyle(styles, this._shadow)

        this.circle.style.width = `${this.size}px`
        this.circle.style.height = `${this.size}px`
        this.circle.style.boxShadow = `#00000088 0px 0px ${blur}px ${spread}px`
        
        this.ref.style.width = `${this.size * 0.5}px`
        this.ref.style.height = `${this.size * 0.5}px`
        
        this.x = this.init.circleInitial?.x ?? this.x
        this.y = this.init.circleInitial?.y ?? this.y
        this.drawPosition()
        this.drawCircleOpacity()
        gvar.os.mediaTower.reobserveAllVideos()
        this.autoHidden = this.autoHide
        this.syncVisibility()
    }
    release = () => {
        this.stop()
        this._release() 
        this.indicator?.release(); delete this.indicator
    }
    start = (video: HTMLVideoElement) => {
        if (!this.addedOutStyle) {
            this.addedOutStyle = true 
            insertStyle(`:root[gspointerdown] {-webkit-touch-callout: none !important; -webkit-user-select: none; user-select: none;}`, document.body)
        }
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
        {!(isMobile() && isMac()) && gvar.os.eListen.contextMenuCbs.add(this.handleContextMenu)}
        gvar.os.eListen.fsCbs.add(this.syncVisibility)

        gvar.os.eListen.touchStartCbs.add(this.handleGuard)
        gvar.os.eListen.touchEndCbs.add(this.handleGuard)
        gvar.os.eListen.touchMoveCbs.add(this.handleGuard)
        gvar.os.eListen.mouseDownCbs.add(this.handleGuard)
        gvar.os.eListen.mouseUpCbs.add(this.handleGuard)
        gvar.os.eListen.mouseMoveCbs.add(this.handleGuard)
        gvar.os.eListen.clickCbs.add(this.handleGuard)
        gvar.os.eListen.dblClickCbs.add(this.handleGuard)
        this._update(true)
    }
    stop = () => {
        if (!this.video) return 
        this.clearSession()
        clearTimeout(this.autoHiddenTimeout); delete this.autoHiddenTimeout
        delete this.video
        this._update(false)
        gvar.os.eListen.pointerDownCbs.delete(this.handlePointerDown)
        gvar.os.eListen.pointerUpCbs.delete(this.handlePointerUp)
        gvar.os.eListen.touchEndCbs.delete(this.handlePointerUp)
        gvar.os.eListen.pointerMoveCbs.delete(this.handlePointerMove)
        gvar.os.eListen.touchMoveCbs.delete(this.handlePointerMove)
        gvar.os.eListen.contextMenuCbs.delete(this.handleContextMenu)
        gvar.os.eListen.fsCbs.delete(this.syncVisibility)

        gvar.os.eListen.touchStartCbs.delete(this.handleGuard)
        gvar.os.eListen.touchEndCbs.delete(this.handleGuard)
        gvar.os.eListen.touchMoveCbs.delete(this.handleGuard)
        gvar.os.eListen.mouseDownCbs.delete(this.handleGuard)
        gvar.os.eListen.mouseUpCbs.delete(this.handleGuard)
        gvar.os.eListen.mouseMoveCbs.delete(this.handleGuard)
        gvar.os.eListen.clickCbs.delete(this.handleGuard)
        gvar.os.eListen.dblClickCbs.delete(this.handleGuard)
    }
    updateClientDimensions = () => {
        this.clientWidth = this._div.clientWidth
        this.clientHeight = this._div.clientHeight
    }
    startShowTimeout = () => {
        this.autoHidden = false   
        clearTimeout(this.autoHiddenTimeout)
        this.autoHiddenTimeout = setTimeout(this.clearShow, 4_000)
        this.syncVisibility()
    }
    clearShow = () => {
        this.autoHidden = true  
        this.syncVisibility()
    }
    syncVisibility = () => {
        if (this.autoHidden || (this.init.fullscreenOnly && !document.fullscreenElement)) {
            this._div.style.opacity = "0"
            this.hidden = true 
            this.circle.style.pointerEvents = "none"
        } else {
            this._div.style.opacity = "1"
            this.hidden = false 
            this.circle.style.pointerEvents = "all"
        }
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
        this.autoHide && this.startShowTimeout()
        if (this.downAt) this.clearSession()
        if (this.isAtCircle(extractClient(e))) {
            this.downAt = Date.now() 
            this.drawCircleOpacity()
            this._div.style.pointerEvents = "all !important"
            this.preventDefault(e)
            isMobile() && isMac() && document.documentElement.setAttribute('gspointerdown', 'true')
            clearSelection()

            this.longPressTimeoutId = (isMobile() && isMac()) ? window.setTimeout(() => {
                this.activateMovingMode()
                clearSelection()
            }, LONG_PRESS_MS) : null 
        } 
    }
    handlePointerUp = (e: PointerEvent | TouchEvent) => {
        clearTimeout(this.longPressTimeoutId)
        if (!this.downAt) return 
        if (e instanceof PointerEvent && e.pointerType !== "mouse") {
            this.preventDefault(e)
            return
        }
        this.autoHide && this.startShowTimeout()
        this.preventDefault(e)
        
        if (!this.movingMode && !this.leftCircle) this.doMain()
        this.clearSession()
    }
    handlePointerMove = async (e: PointerEvent | TouchEvent) => {
        this.autoHide && this.startShowTimeout()
        if (!this.downAt) return 
        if (e instanceof PointerEvent && e.pointerType !== "mouse") {
            this.preventDefault(e)
            return
        }
        this.preventDefault(e)
        clearSelection()
        let { clientX, clientY } = extractClient(e)

        if (this.movingMode) {
            this.updateClientDimensions()
            if (isFirefoxMobile()) clientY -= (window.visualViewport.height - window.innerHeight) / 2
            this.x = clientX / this.clientWidth * 100
            this.y = clientY / this.clientHeight * 100



            if (this.isAtDelete()) {
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
        clearTimeout(this.longPressTimeoutId)
    }
    handleContextMenu = (e: MouseEvent) => {
        this.autoHide && this.startShowTimeout()
        if (this.isAtCircle(extractClient(e))) {
            this.activateMovingMode()
            e.cancelable && e.preventDefault()
            e.stopImmediatePropagation()
        }
    }
    clearSession = () => {
        isMobile() && isMac() && document.documentElement.removeAttribute('gspointerdown')
        this._div.style.pointerEvents = "none"
        this.clearDirectional()
        this.clearMovingMode()
        delete this.downAt       
        this.drawCircleOpacity()
        clearSelection()
    }
    isAtCircle = (xy: ReturnType<typeof extractClient>) => {
        if (this.hidden) return 
        let { clientX, clientY } = xy 
        const circleXY = this.ref.getBoundingClientRect()
        let x = circleXY.x + circleXY.width * 0.5
        let y = circleXY.y + circleXY.height * 0.5
        let half = 0.5 * (isMobile() ? 1.5 : 1.1)
        if (isFirefoxMobile()) y += (window.visualViewport.height - window.innerHeight) / 2 
        if (
            between(x - this.size * half, x + this.size * half, clientX) && 
            between(y - this.size * half, y + this.size * half, clientY)
        ) return true 
        
    }
    isAtDelete = (large?: boolean) => {
        let circleBounds = this.ref.getBoundingClientRect()
        let circleXY:  ReturnType<typeof extractClient> = {clientX: circleBounds.x + circleBounds.width * 0.5, clientY: circleBounds.y + circleBounds.height * 0.5}

        let deleteBounds = this.delete.getBoundingClientRect()

        let deleteX = deleteBounds.x + deleteBounds.width * 0.5
        let deleteY = deleteBounds.y + deleteBounds.height * 0.5
        let half = 0.5 * (large ? 3 : 1)

        if (
            between(deleteX - deleteBounds.width * half, deleteX + deleteBounds.width * half, circleXY.clientX) && 
            between(deleteY - deleteBounds.height * half, deleteY + deleteBounds.height * half, circleXY.clientY)
        ) return true 
    }
    doMain = () => {
        this.init.mainAction === "PAUSE" ? this.togglePause() : this.toggleSpeed()
    }
    togglePause = async () => {
        let paused = !this.video.paused
        setPause(this.video, paused ? 'on' : 'off')
    }
    toggleSpeed = async () => {
        let speed = this.init.mainActionSpeed || 3  
        const view = await fetchView({speed: true, lastSpeed: true}, gvar.tabInfo.tabId)
        let lastSpeed = view.lastSpeed

        if (view.speed?.toFixed(2) === speed.toFixed(2)) {
            [speed, lastSpeed] = [view.lastSpeed, view.speed]
        }

        pushView({override: {speed, lastSpeed: view.speed}, tabId: gvar.tabInfo.tabId})
        this.indicator.show({text: formatSpeed(speed)})
    }
    handleDirectionalInterval = async () => {
        if (!this.combo) {
            this.clearDirectional() 
            return 
        }
        this.autoHide && this.startShowTimeout()
        this.combo.combo++
        let isVertical = this.direction === Direction.TOP || this.direction === Direction.BOTTOM
        let isNegative = this.direction === Direction.LEFT || this.direction === Direction.TOP
        this.circle.style.transform = `translate${(isVertical) ? 'Y' : 'X'}(${(isNegative) ? '-' : ''}${this.strong ? '40' : '20'}px)`
        let isFixed = !!(isVertical ? this.init.fixedSpeedStep : this.init.fixedSeekStep)
        this.circle.style.border = this.strong ? '5px solid red' : '5px solid white'
        this.ref.style.opacity = "1"

        let direction = this.direction

        if (isVertical) {
            let delta = this.strong ? 0.25 : (this.init.fixedSpeedStep || 0.1)
            const view = await fetchView({speed: true}, gvar.tabInfo.tabId)
            let speed = conformSpeed(roundTo(view.speed + (direction === Direction.TOP ? delta : -delta), delta))
            pushView({override: {speed, lastSpeed: view.speed}, tabId: gvar.tabInfo.tabId})
            this.indicator.show({text: formatSpeed(speed)})
        } else {
            let delta = this.strong ? 30 : (this.init.fixedSeekStep || 10)
            if (!isFixed && this.combo.combo > 3) {
                delta *= 1.2 ** this.combo.combo
            }
            seekTo(this.video, this.video.currentTime + (this.direction === Direction.LEFT ? -delta : delta))
            this.indicator.show({text: formatDuration(this.video.currentTime - this.combo.initialTime, true)})
        }
    }
    getDirection = (clientX: number, clientY: number): Direction => {
        this.updateClientDimensions()
        const circleXY = this.ref.getBoundingClientRect()
        let x = circleXY.x + circleXY.width * 0.5
        let y = circleXY.y + circleXY.height * 0.5

        if (isFirefoxMobile()) y += (window.visualViewport.height - window.innerHeight) / 2 
        
        const deltaX = clientX - x
        const deltaY = clientY - y

        const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2)

        if (distance < MIN_TO_ACTIVATE) return 
        const direction = (Math.abs(deltaX) > Math.abs(deltaY)) ? (deltaX >= 0 ? Direction.RIGHT : Direction.LEFT) : (deltaY >= 0 ? Direction.BOTTOM : Direction.TOP)
        const isVertical = direction === Direction.TOP || direction === Direction.BOTTOM
        const isFixed = !!(isVertical ? this.init.fixedSpeedStep : this.init.fixedSeekStep)

        this.strong = distance > MIN_STRONG && !isFixed
        
        return direction
    }
    clearDirectional = () => {
        if (this.direction) {
            delete this.combo
            delete this.direction
            delete this.leftCircle
            this.circle.style.transform = ''
            this.circle.style.border = '5px solid white'
            this.ref.style.opacity = "0"
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
        if (this.delete.style.top) this.delete.style.top = null
        this.conflictWithDelete = this.isAtDelete(true)
        this.circle.style.border = "5px solid yellow"
        this.delete.style.opacity = "0.75"
        this.delete.style.top = this.conflictWithDelete ? `calc(70vh + 60px)` : null
    }
    clearMovingMode = () => {
        if (!this.movingMode) return 
        this.indicator.show({text: 'Standard', duration: 2000})
        this.movingMode = false 
        this.conflictWithDelete = false 
        this.circle.style.border = "5px solid white"
        this.delete.style.opacity = "0"
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
    let minWidth = size / window.visualViewport.width * 100 * 2
    let minHeight = size / window.visualViewport.height * 100 * 2
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

function clearSelection() {
    const sel = document.getSelection?.();
    if (sel && sel.rangeCount) {
        sel.removeAllRanges();
    }
}