import { GoArrowDown, GoArrowUp } from "react-icons/go"

type MoveProps = {
	onMove: (down: boolean) => void
}

export function Move(props: MoveProps) {
	return (
		<div className="Move grid grid-flow-row">
			<button className="icon" onClick={() => props.onMove(false)}>
				<GoArrowUp size="1.42rem" />
			</button>
			<button className="icon" onClick={() => props.onMove(true)}>
				<GoArrowDown size="1.42rem" />
			</button>
		</div>
	)
}
