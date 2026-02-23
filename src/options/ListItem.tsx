import { useRef, useState } from "react"
import { MoveDrag } from "@/comps/MoveDrag"
import clsx from "clsx"
import { GoX } from "react-icons/go"
import "./ListItem.css"
import { useTooltipAnchor } from "@/comps/Tooltip"

type ListItemProps = {
    children?: React.ReactNode,
    listRef: React.RefObject<HTMLElement>,
    spacing: number,
    label: string,
    onMove: (newIndex: number) => void,
    onRemove: () => void,
    onClearLabel: () => void 
    
}

export function ListItem(props: ListItemProps) {
    const itemRef = useRef<HTMLDivElement>(null)
    const [focus, setFocus] = useState(false)
    const deleteRef = useTooltipAnchor<HTMLButtonElement>({
        label: gvar.gsm.token.delete,
        align: "top",
    })

    return (
        <div ref={itemRef} className={clsx('ListItem', {
            focus,
            spacing: props.spacing === 1,
            doubleSpacing: props.spacing === 2,
        })}>
            {props.label && (
            <div className="ListItemLabel" onClick={props.onClearLabel}>
                <span>{props.label}<GoX/></span>
            </div>
            )}
            <div className="ListItemCore">
                {/* Grippper */}
                <MoveDrag setFocus={v => setFocus(v)} itemRef={itemRef} listRef={props.listRef} onMove={props.onMove} />

                <div className="children">
                    {props.children}
                </div>

                {/* Delete */}
                <button ref={deleteRef} className="close icon" onClick={e => props.onRemove()}>
                    <GoX size="1.6rem" />
                </button>
            </div>
            <div className="ListItemSub"></div>
        </div>
    )
}
