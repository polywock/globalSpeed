import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { IoEllipsisVertical } from "react-icons/io5"
import { Menu, type MenuProps } from "src/comps/Menu"
import { Tooltip } from "src/comps/Tooltip"

export type KebabListProps = {
    list:  MenuProps["items"],
    onSelect: (name: string) => boolean | void,
    divIfEmpty?: boolean
}

export function KebabList(props: KebabListProps) {
    const [menu, setMenu] = useState(null as { x: number, y: number, adjusted?: boolean })
    const menuRef = useRef<HTMLDivElement>()
    const buttonRef = useRef<HTMLButtonElement>()
    
    const onContext = (e: React.MouseEvent) => {
        e.preventDefault()
        setMenu({ x: e.clientX, y: e.clientY })
    }

    useEffect(() => {
        if (!menu || menu.adjusted) return 

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
        <Tooltip withClass="kebabTooltip" title={gvar.gsm.token.more} align="top">
            <button ref={buttonRef} className="icon" onClick={onContext}>
                <IoEllipsisVertical style={{ pointerEvents: "none" }} title="..." size="1.3em" />
            </button>
        </Tooltip>
        {!menu ? (props.divIfEmpty ? <div/> : null) : (
            <Menu menuRef={menuRef} items={[...(props.list || [])]} position={menu} onClose={() => setMenu(null)} onSelect={props.onSelect} />
        )}
    </>
}