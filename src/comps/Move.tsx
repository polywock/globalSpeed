import { GoArrowDown, GoArrowUp } from "react-icons/go"
import { Button } from "./ui/button"

type MoveProps = {
	onMove: (down: boolean) => void
}

export function Move(props: MoveProps) {
	return (
		<div data-slot="move" className="grid grid-flow-row">
			<Button variant="icon" size="icon-auto" onClick={() => props.onMove(false)}>
				<GoArrowUp size="1.42rem" />
			</Button>
			<Button variant="icon" size="icon-auto" onClick={() => props.onMove(true)}>
				<GoArrowDown size="1.42rem" />
			</Button>
		</div>
	)
}
