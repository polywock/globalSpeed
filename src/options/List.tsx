import { RefObject } from "react"
import "./List.css"

type ListProps = {
	children: React.ReactNode
	listRef: RefObject<HTMLDivElement>
	spacingChange: (idx: number) => void
}

export function List(props: ListProps) {
	return (
		<div className="List" ref={props.listRef} onPointerDown={(e) => handlePointerDown(props.listRef, props.spacingChange, e)}>
			{props.children}
		</div>
	)
}

function handlePointerDown(
	listRef: React.RefObject<HTMLDivElement>,
	onSpacingChange: ListProps["spacingChange"],
	e: React.MouseEvent<HTMLDivElement>,
) {
	if (
		!(
			e.target === listRef.current ||
			(e.target as HTMLElement).classList.contains("ListItemLabel") ||
			(e.target as HTMLElement).classList.contains("ListItemSub")
		)
	)
		return

	const y = e.clientY
	const children = [...(listRef.current as HTMLDivElement).getElementsByClassName("ListItemCore")]

	let index = -1
	for (let child of children) {
		if (y < child.getBoundingClientRect().y) break
		index++
	}

	index >= 0 && onSpacingChange(index)
}
