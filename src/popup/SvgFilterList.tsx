import { useState } from "react"
import { Select } from "@/comps/Select"
import { Button } from "@/comps/ui/button"
import { svgFilterGenerate, svgFilterInfos, svgFilterIsValid } from "@/defaults/filters"
import { SVG_FILTER_ADDITIONAL } from "@/defaults/svgFilterAdditional"
import { gvar } from "@/globalVar"
import { SvgFilter } from "@/types"
import { produce } from "@/utils/helper"
import { SvgFilterItem } from "./SvgFilterItem"

const filterTypes = Object.keys(svgFilterInfos)
filterTypes.splice(
	filterTypes.findIndex((f) => f === "custom"),
	1,
)

export function SvgFilterList(props: { svgFilters: SvgFilter[]; onChange: (newSvgFilters: SvgFilter[], forceEnable?: boolean) => void }) {
	const [command, setCommand] = useState("rgb")

	return (
		<div className="mt-3.75 border-t border-border">
			<div className="mt-1.5 text-center text-sm opacity-50">{gvar.gsm.filter.otherFilters.header}</div>
			<div>
				{props.svgFilters.map((f) => (
					<SvgFilterItem
						key={f.id}
						filter={f}
						onChange={(newFilter) => {
							const typeInfo = SVG_FILTER_ADDITIONAL[newFilter.type]

							const isActive = newFilter.enabled && svgFilterIsValid(newFilter, typeInfo.isValid)
							props.onChange(
								produce(props.svgFilters, (dArr) => {
									let idx = dArr.findIndex((v) => v.id === f.id)
									if (idx >= 0) dArr[idx] = newFilter
								}),
								isActive,
							)
						}}
						list={props.svgFilters}
						listOnChange={props.onChange}
					/>
				))}
			</div>
			<div className="mt-2.5 flex gap-x-2.5">
				<Select
					value={command}
					onChanged={(newValue) => {
						setCommand(newValue)
					}}
					options={filterTypes.map((t) => ({ key: t, value: (gvar.gsm.filter.otherFilters as any)[t] }))}
				/>
				<Button
					onClick={(e) => {
						props.onChange(
							produce(props.svgFilters, (dArr) => {
								let cmd = command as keyof typeof svgFilterInfos
								if (e.shiftKey && e.metaKey) cmd = "custom"
								dArr.push(svgFilterGenerate(cmd))
							}),
							true,
						)
					}}
				>
					{gvar.gsm.token.create}
				</Button>
			</div>
		</div>
	)
}
