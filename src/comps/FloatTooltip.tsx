type FloatTooltipProps = {
	value: string
}

export const FloatTooltip = (props: FloatTooltipProps) => {
	return (
		<div className="absolute -right-20 bottom-10 -left-20 grid justify-center text-sm">
			<div className="inline-block rounded-lg bg-destructive p-1.25 text-destructive-foreground">{props.value}</div>
		</div>
	)
}
