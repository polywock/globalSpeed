import { useEffect, useRef, useState } from "react"
import { IoEllipsisVertical } from "react-icons/io5"
import { Menu, type MenuProps } from "@/comps/Menu"
import { useTooltipAnchor } from "@/comps/Tooltip"

export type KebabListProps = {
    list:  MenuProps["items"],
    onSelect: (name: string) => boolean | void,
    divIfEmpty?: boolean,
    title?: string,
    centered?: boolean,
    onOpen?: () => void 
}

export function KebabList(props: KebabListProps) {
    const [menu, setMenu] = useState(null as { x?: number, y?: number, adjusted?: boolean, centered?: boolean })
    const menuRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const kebabTip = useTooltipAnchor<HTMLButtonElement>({
        label: props.title ?? gvar.gsm.token.more,
        align: "top"
    })
    
    const onContext = (e: React.MouseEvent) => {
        e.preventDefault()
        props.onOpen?.()
        if (props.centered) {
            setMenu({centered: true})
            return 
        }
        setMenu({ x: e.clientX, y: e.clientY })
    }

    useEffect(() => {
        if (!menu || menu.adjusted || menu.centered) return 

        const bounds = menuRef.current.getBoundingClientRect()
        const buttonBounds = buttonRef.current.getBoundingClientRect()
        let x = menu.x
        let y = menu.y


        if ((bounds.x + bounds.width) > (window.innerWidth - 15)) {
            x = buttonBounds.x - 10 - bounds.width
        }
        if ((bounds.y + bounds.height) > window.innerHeight) {
            y = buttonBounds.y - 10 - bounds.height
        }
        setMenu({x, y, adjusted: true})
    }, [menu])

    return <>
        {props.title}
        <button
            ref={elem => {
                buttonRef.current = elem
                kebabTip.current = elem
            }}
            className="icon kebabTooltip"
            onClick={onContext}
        >
            <IoEllipsisVertical style={{ pointerEvents: "none" }} size="1.3em" />
        </button>
        {!menu ? (props.divIfEmpty ? <div/> : null) : (
            <Menu menuRef={menuRef} items={[...(props.list || [])]} position={menu} onClose={() => setMenu(null)} onSelect={props.onSelect} />
            
        )}
    </>
}
