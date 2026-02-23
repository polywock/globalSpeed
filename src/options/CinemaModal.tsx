import { produce } from "immer"
import { ModalBase } from "../comps/ModalBase"
import { SliderMicro } from "@/comps/SliderMicro"
import { useStateView } from "../hooks/useStateView"
import { Reset } from "@/comps/Reset"
import { CinemaMode, Keybind } from "@/types"
import { NumericInput } from "@/comps/NumericInput"
import "./CinemaModal.css"
import { getDefaultCinemaInit } from "@/defaults/constants"
import { Filters } from "@/popup/Filters"
import { getDefaultCinemaFilter } from "@/defaults/filters"

type Props = {
	value: Keybind
	onChange: (id: string, newKb: Keybind) => void
	onClose: () => void
}

const defaultInit = getDefaultCinemaInit()
const defaultCinemaFilter = getDefaultCinemaFilter()

export function CinemaModal(props: Props) {
	const [view, setView] = useStateView({ circleInit: true })
	if (!view) return null
	let kb = props.value as Keybind
	let init = kb.cinemaInit || defaultInit
	const mode = init.mode || defaultInit.mode

	return (
		<ModalBase keepOnWheel={true} onClose={props.onClose}>
			<div className="CinemaModal ModalMain">
				{/* Mode */}
				<div className="field">
					<span>{gvar.gsm.token.mode}</span>
					<div className="fieldValue">
						<select
							value={mode}
							onChange={(e) => {
								props.onChange(
									kb.id,
									produce(kb, (kb) => {
										if (!kb.cinemaInit) kb.cinemaInit = structuredClone(defaultInit)
										kb.cinemaInit.mode = parseInt(e.target.value)
									}),
								)
							}}
						>
							<option value={CinemaMode.STANDARD.toString()}>{gvar.gsm.token.modeStandard}</option>
							<option value={CinemaMode.CUSTOM_COLOR.toString()}>{gvar.gsm.token.modeCustomColor}</option>
							<option value={CinemaMode.CUSTOM_FILTER.toString()}>{gvar.gsm.token.modeCustomFilter}</option>
						</select>
					</div>
				</div>

				{/* Color */}
				{mode === CinemaMode.CUSTOM_COLOR && (
					<div className="field">
						<span>{gvar.gsm.token.color}</span>
						<div className="fieldValue mxmx">
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
					</div>
				)}

				{/* Opacity */}
				{mode !== CinemaMode.CUSTOM_FILTER && (
					<div className="field">
						<span>{mode === CinemaMode.STANDARD ? gvar.gsm.token.darkness : gvar.gsm.filter.opacity}</span>
						<div className="fieldValue">
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
					</div>
				)}

				{/* Rounding */}
				<div className="field">
					<span>{gvar.gsm.token.rounding}</span>
					<div className="fieldValue">
						<NumericInput
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
				</div>

				{/* Filters */}
				{mode === CinemaMode.CUSTOM_FILTER && (
					<div className="filters">
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
				<button
					onClick={(e) => {
						props.onChange(
							kb.id,
							produce(kb, (kb) => {
								delete kb.cinemaInit
							}),
						)
					}}
					className="reset"
				>
					{gvar.gsm.token.reset}
				</button>
			</div>
		</ModalBase>
	)
}
