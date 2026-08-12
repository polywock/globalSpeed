import { cn } from "@/utils/helper"

type OriginProps = {
	x: string
	y: string
	onChange: (x: string, y: string) => void
}

export function Origin(props: OriginProps) {
	return (
		<div className="grid grid-cols-[repeat(3,max-content)] justify-around gap-y-3.75">
			{Y_OPTIONS.map((y) => X_OPTIONS.map((x) => [x, y]))
				.flat(1)
				.map(([x, y]) => (
					<div
						className={cn(
							"h-3.75 w-7.5 border border-border-x bg-background focus:outline focus:outline-1 focus:outline-ring",
							x === props.x && y === props.y && "bg-border-x",
						)}
						key={`${x}:${y}`}
						tabIndex={0}
						onClick={(e) => props.onChange(x, y)}
					></div>
				))}
		</div>
	)
}

const X_OPTIONS = ["left", "center", "right"]
const Y_OPTIONS = ["top", "center", "bottom"]
