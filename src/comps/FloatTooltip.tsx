type FloatTooltipProps = {
	value: string
}

export const FloatTooltip = (props: FloatTooltipProps) => {
	return (
		<div className="FloatTooltip absolute right-[-80px] bottom-[40px] left-[-80px] grid justify-center text-[0.9em]">
			<div className="inline-block rounded-[var(--radius)] bg-destructive p-[5px] text-primary-foreground">{props.value}</div>
		</div>
	)
}
