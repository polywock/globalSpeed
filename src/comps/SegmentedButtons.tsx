export const SegmentedButtons = (props: { numbers: number[]; value: number; onChange: (newNumber: number) => void }) => {
	return (
		<div className="grid auto-cols-[1fr] grid-flow-col select-none">
			{props.numbers.map((v, i) => (
				<button
					aria-pressed={props.value === v}
					className="button-control rounded-none px-2.5 py-1.25 opacity-50 first:rounded-l-lg last:rounded-r-lg aria-pressed:opacity-100 aria-pressed:brightness-90 dark:aria-pressed:brightness-130"
					key={i}
					onClick={(e) => {
						props.onChange(v)
					}}
				>
					{v}
				</button>
			))}
		</div>
	)
}
