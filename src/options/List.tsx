import { RefObject } from "react"

type ListProps = {
	children: React.ReactNode
	listRef: RefObject<HTMLDivElement>
	spacingChange: (idx: number) => void
}

export function List(props: ListProps) {
	return (
		<div
			className="cursor-ns-resize select-none [interpolate-size:allow-keywords]"
			ref={props.listRef}
			onPointerDown={(e) => handlePointerDown(props.listRef, props.spacingChange, e)}
		>
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
			(e.target as HTMLElement).dataset.slot === "list-item-label" ||
			(e.target as HTMLElement).dataset.slot === "list-item-sub"
		)
	)
		return

	const y = e.clientY
	const children = [...(listRef.current as HTMLDivElement).querySelectorAll<HTMLElement>("[data-slot='list-item-core']")]

	let index = -1
	for (let child of children) {
		if (y < child.getBoundingClientRect().y) break
		index++
	}

	index >= 0 && onSpacingChange(index)
}
