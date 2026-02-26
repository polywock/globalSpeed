import { produce } from "immer"
import { useState } from "react"
import { Move } from "../comps/Move"
import { SliderPlus } from "../comps/SliderPlus"
import { filterInfos } from "../defaults/filters"
import { FilterEntry } from "../types"
import { moveItem } from "../utils/helper"
import "./Filters.css"

type FiltersProps = {
	filters: FilterEntry[]
	onChange: (newValue: FilterEntry[]) => void
	className?: string
}

export function Filters(props: FiltersProps) {
	const [syncScale, setSyncScale] = useState(false)

	return (
		<div className={`Filters ${props.className || ""}`}>
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
		<div className="Filter">
			<Move onMove={(down) => props.onMove(down)} />
			<SliderPlus
				label={
					<>
						{gvar.gsm.filter[entry.name]}
						{!props.syncChange ? null : (
							<button
								onClick={() => props.syncChange()}
								style={{ padding: "0px 5px", marginLeft: "10px" }}
								className={`toggle ${props.syncValue ? "active" : ""}`}
							>
								:
							</button>
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
