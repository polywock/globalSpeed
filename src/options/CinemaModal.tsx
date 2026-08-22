import { NumericInput } from "@/comps/NumericInput"
import { Reset } from "@/comps/Reset"
import { Select } from "@/comps/Select"
import { SliderMicro } from "@/comps/SliderMicro"
import { Button } from "@/comps/ui/button"
import { getDefaultCinemaInit } from "@/defaults/constants"
import { getDefaultCinemaFilter } from "@/defaults/filters"
import { gvar } from "@/globalVar"
import { Filters } from "@/popup/Filters"
import { CinemaMode, Keybind } from "@/types"
import { produce } from "@/utils/helper"
import { ModalBase, ModalContent } from "../comps/ModalBase"
import { useStateView } from "../hooks/useStateView"
import { OptionField } from "./OptionField"

type Props = {
	value: Keybind
	onChange: (id: string, newKb: Keybind) => void
	onClose: () => void
}

const defaultInit = getDefaultCinemaInit()
const defaultCinemaFilter = getDefaultCinemaFilter()

export function CinemaModal(props: Props) {
	const [view] = useStateView({ circleInit: true })
	if (!view) return null
	let kb = props.value as Keybind
	let init = kb.cinemaInit || defaultInit
	const mode = init.mode || defaultInit.mode

	return (
		<ModalBase keepOnWheel={true} onClose={props.onClose}>
			<ModalContent size="lg" className="[--field-name-width:200px]">
				{/* Mode */}
				<OptionField>
					<span>{gvar.gsm.token.mode}</span>
					<div className="relative leading-0">
						<Select
							value={`${mode}`}
							onChanged={(newValue) => {
								props.onChange(
									kb.id,
									produce(kb, (kb) => {
										if (!kb.cinemaInit) kb.cinemaInit = structuredClone(defaultInit)
										kb.cinemaInit.mode = parseInt(newValue)
									}),
								)
							}}
							options={[
								{ key: CinemaMode.STANDARD.toString(), value: gvar.gsm.token.modeStandard },
								{ key: CinemaMode.CUSTOM_COLOR.toString(), value: gvar.gsm.token.modeCustomColor },
								{ key: CinemaMode.CUSTOM_FILTER.toString(), value: gvar.gsm.token.modeCustomFilter },
							]}
						/>
					</div>
				</OptionField>

				{/* Color */}
				{mode === CinemaMode.CUSTOM_COLOR && (
					<OptionField>
						<span>{gvar.gsm.token.color}</span>
						<div className="relative grid grid-cols-[max-content_max-content] items-center gap-x-1.25 leading-0">
							<input
								type="color"
								value={init.color ?? defaultInit.color}
								onChange={(e) => {
									props.onChange(
										kb.id,
										produce(kb, (kb) => {
											if (!kb.cinemaInit) kb.cinemaInit = structuredClone(defaultInit)
											kb.cinemaInit.color = e.target.value || null
										}),
									)
								}}
							/>
							<Reset
								onClick={() => {
									props.onChange(
										kb.id,
										produce(kb, (kb) => {
											if (!kb.cinemaInit) kb.cinemaInit = structuredClone(defaultInit)
											delete kb.cinemaInit.color
										}),
									)
								}}
								active={(kb.cinemaInit?.color || defaultInit.color) !== defaultInit.color}
							/>
						</div>
					</OptionField>
				)}

				{/* Opacity */}
				{mode !== CinemaMode.CUSTOM_FILTER && (
					<OptionField>
						<span>{mode === CinemaMode.STANDARD ? gvar.gsm.token.darkness : gvar.gsm.filter.opacity}</span>
						<div className="relative leading-0">
							<SliderMicro
								value={init.colorAlpha ?? defaultInit.colorAlpha}
								onChange={(v) => {
									props.onChange(
										kb.id,
										produce(kb, (kb) => {
											if (!kb.cinemaInit) kb.cinemaInit = structuredClone(defaultInit)
											kb.cinemaInit.colorAlpha = v
										}),
									)
								}}
								default={90}
								sliderMin={0}
								sliderMax={100}
								sliderStep={1}
							/>
						</div>
					</OptionField>
				)}

				{/* Rounding */}
				<OptionField>
					<span>{gvar.gsm.token.rounding}</span>
					<div className="relative leading-0">
						<NumericInput
							className="inline-block w-15"
							value={init.rounding}
							onChange={(v) => {
								props.onChange(
									kb.id,
									produce(kb, (kb) => {
										if (!kb.cinemaInit) kb.cinemaInit = structuredClone(defaultInit)
										kb.cinemaInit.rounding = v
									}),
								)
							}}
							min={0}
							placeholder={`${init.rounding ?? defaultInit.rounding}`}
						/>
					</div>
				</OptionField>

				{/* Filters */}
				{mode === CinemaMode.CUSTOM_FILTER && (
					<div className="my-7.5 max-w-[300px] border-y border-border py-5">
						<Filters
							filters={init.filter || defaultCinemaFilter}
							onChange={(filter) => {
								props.onChange(
									kb.id,
									produce(kb, (kb) => {
										if (!kb.cinemaInit) kb.cinemaInit = structuredClone(defaultInit)
										kb.cinemaInit.filter = filter
									}),
								)
							}}
						/>
					</div>
				)}

				{/* Reset */}
				<Button
					onClick={(e) => {
						props.onChange(
							kb.id,
							produce(kb, (kb) => {
								delete kb.cinemaInit
							}),
						)
					}}
				>
					{gvar.gsm.token.reset}
				</Button>
			</ModalContent>
		</ModalBase>
	)
}
