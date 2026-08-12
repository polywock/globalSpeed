import { LuPlus } from "react-icons/lu"
import { gvar } from "@/globalVar"
import { produce } from "@/utils/helper"
import { NumericInput } from "./NumericInput"
import { Tooltip } from "./Tooltip"

type CycleInputProps = {
	values: number[]
	onChange: (newValues: number[]) => void
	min?: number
	max?: number
	defaultValue: number
}

export function CycleInput(props: CycleInputProps) {
	return (
		<div className="group">
			<div className="grid grid-cols-[repeat(4,max-content)] items-center gap-1.75">
				{
					<>
						{props.values.map((value, i) => (
							<div key={i} className="value relative w-11">
								{/* Value */}
								<NumericInput
									value={value}
									onChange={(v) => {
										props.onChange(
											produce(props.values, (d) => {
												d[i] = v
											}),
										)
									}}
									min={props.min}
									max={props.max}
									noNull={true}
								/>

								{/* Delete circle */}
								{props.values.length > 0 && (
									<Tooltip title={gvar.gsm.token.delete}>
										<div
											className="absolute -top-1.25 -right-1.25 h-2.75 w-2.75 rounded-full border border-destructive bg-destructive-bg opacity-0 group-hover:opacity-90 hover:opacity-100"
											onClick={(e) => {
												props.onChange(
													produce(props.values, (d) => {
														d.splice(i, 1)
													}),
												)
											}}
										/>
									</Tooltip>
								)}
							</div>
						))}

						{/* Add button */}
						<div>
							<Tooltip title={gvar.gsm.token.create}>
								<button
									className="button-control text-4xs"
									onClick={(e) => {
										props.onChange(
											produce(props.values, (d) => {
												d.push(props.defaultValue ?? 0)
											}),
										)
									}}
								>
									<LuPlus />
								</button>
							</Tooltip>
						</div>
					</>
				}
			</div>
		</div>
	)
}
