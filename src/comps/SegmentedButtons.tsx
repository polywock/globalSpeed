export const SegmentedButtons = (props: { numbers: number[]; value: number; onChange: (newNumber: number) => void }) => {
	return (
		<div className="SegmentedButtons grid auto-cols-[1fr] grid-flow-col select-none">
			{props.numbers.map((v, i) => (
				<button
					className={`rounded-none px-[10px] py-[5px] first:rounded-l-[var(--radius)] last:rounded-r-[var(--radius)] ${props.value === v ? "selected opacity-100 brightness-[.9] dark:brightness-[1.3]" : "opacity-50"}`}
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
