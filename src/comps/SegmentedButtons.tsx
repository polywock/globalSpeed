import { Button } from "./ui/button"

export const SegmentedButtons = (props: { numbers: number[]; value: number; onChange: (newNumber: number) => void }) => {
	return (
		<div className="grid auto-cols-[1fr] grid-flow-col select-none">
			{props.numbers.map((v, i) => (
				<Button
					aria-pressed={props.value === v}
					className="rounded-none opacity-50 first:rounded-l-lg last:rounded-r-lg active:translate-y-0 aria-pressed:opacity-100 aria-pressed:brightness-90 dark:aria-pressed:brightness-130"
					key={i}
					onClick={(e) => {
						props.onChange(v)
					}}
				>
					{v}
				</Button>
			))}
		</div>
	)
}
