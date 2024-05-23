import { useState } from "react"
import { IoEllipsisVertical } from "react-icons/io5"
import { Menu, type MenuProps } from "src/comps/Menu"

export type KebabListProps = {
    list:  MenuProps["items"],
    onSelect: (name: string) => boolean | void,
    divIfEmpty?: boolean
}

export function KebabList(props: KebabListProps) {
    const [menu, setMenu] = useState(null as { x: number, y: number })
    
    const onContext = (e: React.MouseEvent) => {
        e.preventDefault()
        setMenu({ x: e.clientX, y: e.clientY })
    }

    return <>
        <button className="icon kebab" onClick={onContext}>
            <IoEllipsisVertical style={{ pointerEvents: "none" }} title="..." size="1.3em" />
        </button>
        {!menu ? (props.divIfEmpty ? <div/> : null) : (
            <Menu items={[...(props.list || [])]} position={menu} onClose={() => setMenu(null)} onSelect={props.onSelect} />
        )}
    </>
}