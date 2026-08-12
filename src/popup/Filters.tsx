import { useState } from "react"
import { ToggleButton } from "@/comps/ToggleButton"
import { gvar } from "@/globalVar"
import { moveItem, produce } from "@/utils/helper"
import { Move } from "../comps/Move"
import { SliderPlus } from "../comps/SliderPlus"
import { filterInfos } from "../defaults/filters"
import { FilterEntry } from "../types"

type FiltersProps = {
	filters: FilterEntry[]
	onChange: (newValue: FilterEntry[]) => void
	className?: string
}

export function Filters(props: FiltersProps) {
	const [syncScale, setSyncScale] = useState(false)

	return (
		<div className={props.className}>
			{props.filters.map((entry) => (
				<Filter
					key={entry.name}
					entry={entry}
					onMove={(down) => {
						props.onChange(
							produce(props.filters, (d) => {
								moveItem(d, (v) => v.name === entry.name, down ? "D" : "U")
							}),
						)
					}}
					onChange={(newValue) => {
						props.onChange(
							produce(props.filters, (d) => {
								const dFilter = d.find((f) => f.name === entry.name)
								dFilter.value = newValue.value

								if (syncScale && dFilter.name.startsWith("scale")) {
									d.filter((entry) => entry.name.startsWith("scale")).forEach((entry) => {
										entry.value = newValue.value
									})
								}
							}),
						)
					}}
					syncChange={entry.name.startsWith("scale") ? () => setSyncScale(!syncScale) : null}
					syncValue={syncScale}
				/>
			))}
		</div>
	)
}

type FilterProps = {
	entry: FilterEntry
	onChange: (newValue: FilterEntry) => void
	onMove: (down: boolean) => void
	syncChange?: () => void
	syncValue?: boolean
}

export function Filter(props: FilterProps) {
	const { entry } = props
	const ref = filterInfos[entry.name].ref

	return (
		<div className="mb-3.75 grid grid-cols-[max-content_1fr] items-start gap-x-1.25 last:mb-0 [&>[data-slot=move]]:gap-y-1.25">
			<Move onMove={(down) => props.onMove(down)} />
			<SliderPlus
				label={
					<>
						{gvar.gsm.filter[entry.name]}
						{!props.syncChange ? null : (
							<ToggleButton active={props.syncValue} onClick={() => props.syncChange()} className="ml-2.5 px-1.25 py-0">
								:
							</ToggleButton>
						)}
					</>
				}
				value={entry.value ?? ref.default}
				sliderMin={ref.sliderMin}
				sliderMax={ref.sliderMax}
				sliderStep={ref.sliderStep}
				min={ref.min}
				max={ref.max}
				default={ref.default}
				onChange={(newValue) => {
					props.onChange(
						produce(entry, (d) => {
							d.value = newValue
						}),
					)
				}}
			/>
		</div>
	)
}
