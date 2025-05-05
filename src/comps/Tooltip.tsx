
import { useRef } from "react"
import { clamp } from "src/utils/helper"
import clsx from "clsx"
import "./Tooltip.css"

type Env = {
    isActive?: boolean,
    signal?: AbortController,
    timeoutId?: number 
}


let latestClear: Function

export type TooltipProps = {
    children: React.ReactNode,
    title?: string,
    align: 'top' | 'bottom' | 'left' | 'right',
    offset?: number,
    maxWidth?: number,
    withClass?: string,
    rawOffsetX?: number,
    rawOffsetY?: number,
    allowClick?: boolean,
    dontAllowFocus?: boolean,
    timeout?: number
}

export function Tooltip(props: TooltipProps) {
    const env = useRef({} as Env).current
    const mainRef = useRef<HTMLDivElement>()
    const tipRef = useRef<HTMLDivElement>()

    const handlePointerEnter = (e: React.PointerEvent | React.MouseEvent | React.FocusEvent) => {
        if (!props.title) return 
        if (env.isActive) return 

        // Little failsafe, no reason two tooltips should be visible at once.
        latestClear?.()
        latestClear = clear 

        clearTimeout(env.timeoutId)
        let align = props.align
        let offset = props.offset ?? 8 
        
        let mainBounds = mainRef.current.getBoundingClientRect()
        let maxWidth = props.maxWidth ?? 400
        if (align === "right") {
            maxWidth = clamp(0, window.innerWidth - mainBounds.x - offset - 40, maxWidth)
        } else if (align === 'left') {
            maxWidth = clamp(0, mainBounds.x - offset - 15, maxWidth)
        }
        maxWidth = clamp(0, window.innerWidth * 0.95, maxWidth)
        tipRef.current.style.maxWidth = `${maxWidth}px`

        env.isActive = true 
        tipRef.current.style.display = "block"
        let tipBounds = tipRef.current.getBoundingClientRect()

        
        // Swap directions if need be.
        let remainingTop = mainBounds.y - offset
        let remainingBottom = window.innerHeight - (mainBounds.y + mainBounds.height + offset)
        if (align === 'top') {
            if (tipBounds.height > remainingTop && remainingBottom > remainingTop) {
                align = 'bottom'
            } 
        } else if (align === 'bottom') {
            if (tipBounds.height > remainingBottom && remainingTop > remainingBottom) {
                align = 'top'
            }
        }



        
        let x = 0
        let y = 0
        let fixX = false
        let fixY = false
        if (align === 'top') {
            y = mainBounds.y - (tipBounds.height + offset)
            x = mainBounds.x + (mainBounds.width - tipBounds.width) * 0.5 
            fixX = true 
        } else if (align === 'bottom') {
            y = (mainBounds.y + mainBounds.height) + offset
            x = mainBounds.x + (mainBounds.width - tipBounds.width) * 0.5 
            fixX = true 
        } else if (align === 'left') {
            x = mainBounds.x - offset - tipBounds.width
            y = mainBounds.y + (mainBounds.height - tipBounds.height) * 0.5 
            fixY = true 
        } else if (align === 'right') {
            x = mainBounds.x + mainBounds.width + offset
            y = mainBounds.y + (mainBounds.height - tipBounds.height) * 0.5 
            fixY = true 
        }

        if (fixX) x = clamp(15, window.innerWidth - tipBounds.width, x)
        if (fixY) y = clamp(15, window.innerHeight - tipBounds.height, y)

        env.signal?.abort()    
        env.signal = new AbortController()
        window.addEventListener('wheel', e => {
            clear()
        }, {signal: env.signal.signal, once: true})

        env.timeoutId = setTimeout(clear, props.timeout || 15_000)

        tipRef.current.style.top = `${y + (props.rawOffsetY || 0)}px` 
        tipRef.current.style.left = `${x + (props.rawOffsetX || 0)}px` 
    }

    const clear = () => {
        if (!env.isActive) return 
        clearTimeout(env.timeoutId)
        env.signal?.abort()    
        env.isActive = false 
        if (!tipRef.current) return 
        tipRef.current.style.left = null 
        tipRef.current.style.top = null 
        tipRef.current.style.display = null 
    }

    const handlePointerLeave = (e?: React.PointerEvent | React.FocusEvent) => {
        if (!props.dontAllowFocus && document.activeElement === e.currentTarget) return 
        clear()
    }

    return <div ref={mainRef} className={clsx('Tooltip', props.withClass)}>
        <div tabIndex={0} 
            onPointerEnter={handlePointerEnter} 
            onPointerLeave={handlePointerLeave} 
            onClick={props.allowClick ? handlePointerEnter : null}
            onFocus={props.dontAllowFocus ? null : handlePointerEnter}
            onBlur={props.dontAllowFocus ? null : handlePointerLeave}
        >{props.children}</div>
        <div ref={tipRef} className="tip">{props.title}</div>
    </div>
}