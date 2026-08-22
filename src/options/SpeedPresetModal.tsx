import { CSSProperties } from "react"
import { SegmentedButtons } from "@/comps/SegmentedButtons"
import { SliderMicro } from "@/comps/SliderMicro"
import { Button } from "@/comps/ui/button"
import { getDefaultSpeedPresets } from "@/defaults/constants"
import { gvar } from "@/globalVar"
import { clamp, produce } from "@/utils/helper"
import { ModalBase, ModalContent } from "../comps/ModalBase"
import { NumericInput } from "../comps/NumericInput"
import { useStateView } from "../hooks/useStateView"
import { OptionField } from "./OptionField"

type Props = {
	onClose: () => void
}

export function SpeedPresetModal(props: Props) {
	const [view, setView] = useStateView({
		speedPresets: true,
		speedBigStep: true,
		speedSmallStep: true,
		speedPresetRows: true,
		speedPresetPadding: true,
	})
	if (!view) return null

	const presets = view.speedPresets?.length === 12 ? view.speedPresets : getDefaultSpeedPresets()

	const handlePresetChange = (idx: number, newValue: number) => {
		setView({
			speedPresets: produce(presets, (d) => {
				d[idx] = newValue
			}),
		})
	}

	const handleStepChange = (newValue: number, big?: boolean) => {
		setView({
			[big ? "speedBigStep" : "speedSmallStep"]: newValue,
		})
	}

	return (
		<ModalBase keepOnWheel={true} onClose={props.onClose}>
			<ModalContent size="sm" className="[--field-name-width:150px]">
				{/* Row selection */}
				<OptionField>
					<span>{gvar.gsm.token.rows}</span>
					<SegmentedButtons
						numbers={[1, 2, 3, 4]}
						value={view.speedPresetRows ?? 4}
						onChange={(v) => {
							setView({ speedPresetRows: v })
						}}
					/>
				</OptionField>

				{/* Size slider */}
				<OptionField>
					<span>{gvar.gsm.token.size}</span>
					<SliderMicro
						value={view.speedPresetPadding ?? 0}
						onChange={(v) => {
							setView({ speedPresetPadding: v ?? null })
						}}
						default={0}
						sliderMin={0}
						sliderMax={10}
						sliderStep={0.1}
					/>
				</OptionField>

				{/* Small step */}
				<OptionField>
					<span>{gvar.gsm.token.smallStep}</span>
					<NumericInput
						value={view.speedSmallStep || 0.01}
						onChange={(t) => handleStepChange(t, false)}
						min={0.001}
						noNull={false}
						placeholder={"0.01"}
					/>
				</OptionField>

				{/* Large step */}
				<OptionField>
					<span>{gvar.gsm.token.largeStep}</span>
					<NumericInput
						value={view.speedBigStep || 0.1}
						onChange={(t) => handleStepChange(t, true)}
						min={0.001}
						noNull={false}
						placeholder={"0.1"}
					/>
				</OptionField>

				{/* Table */}
				<div
					className="mt-5 mb-3.75 ml-5 grid grid-cols-[repeat(3,max-content)] gap-2.5 text-md"
					style={
						{
							"--padding": `${5 + (view.speedPresetPadding ?? 0)}px`,
						} as CSSProperties
					}
				>
					{/* Cell inputs */}
					{presets.slice(0, clamp(1, 4, view.speedPresetRows ?? 4) * 3).map((v, i) => (
						<NumericInput
							className="w-15 [&>input]:px-0 [&>input]:py-[var(--padding)]"
							key={i}
							value={v}
							onChange={(t) => handlePresetChange(i, t)}
							min={0.07}
							max={16}
							noNull={true}
						/>
					))}
				</div>

				{/* Reset */}
				<Button
					size="lg"
					onClick={(e) => {
						setView({ speedPresetPadding: null, speedPresetRows: null, speedPresets: null, speedSmallStep: null, speedBigStep: null })
					}}
				>
					{gvar.gsm.token.reset}
				</Button>
			</ModalContent>
		</ModalBase>
	)
}
