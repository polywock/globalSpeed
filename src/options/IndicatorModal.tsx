import { Reset } from "@/comps/Reset"
import { Select } from "@/comps/Select"
import { SliderMicro } from "@/comps/SliderMicro"
import { Button } from "@/comps/ui/button"
import { Indicator } from "@/contentScript/isolated/utils/Indicator"
import { gvar } from "@/globalVar"
import { produce, randomId } from "@/utils/helper"
import { ModalBase, ModalContent } from "../comps/ModalBase"
import { INDICATOR_CIRCLE_INIT, INDICATOR_INIT } from "../defaults"
import { IndicatorInit } from "../types"
import { OptionField } from "./OptionField"

type Props = {
	indicator: IndicatorInit
	onChange: (newValue: IndicatorInit) => void
	onClose: () => void
	forCircle?: boolean
}

export function IndicatorModal(props: Props) {
	const { onChange } = props
	const init = props.indicator || {}
	const defaultInit = props.forCircle ? INDICATOR_CIRCLE_INIT : INDICATOR_INIT

	return (
		<ModalBase keepOnWheel={true} onClose={props.onClose}>
			<ModalContent size="md">
				{/* Position */}
				<OptionField>
					<span>{gvar.gsm.token.position}</span>
					<div>
						<Select
							aria-label={gvar.gsm.token.position}
							className="mr-2.5"
							value={init?.position ?? defaultInit.position}
							onChanged={(newValue) => {
								const indicatorInit = produce(init ?? {}, (d) => {
									d.position = newValue as any
									d.key = randomId()
								})
								showIndicator(indicatorInit, props.forCircle)
								onChange(indicatorInit)
							}}
							options={[
								{ key: "TL", value: gvar.gsm.token.topLeft },
								{ key: "TR", value: gvar.gsm.token.topRight },
								{ key: "BL", value: gvar.gsm.token.bottomLeft },
								{ key: "BR", value: gvar.gsm.token.bottomRight },
								{ key: "C", value: gvar.gsm.token.center },
							]}
						/>
						<Reset
							onClick={() => {
								const indicatorInit = produce(init ?? {}, (d) => {
									delete d.position
									d.key = randomId()
								})
								showIndicator(indicatorInit, props.forCircle)
								onChange(indicatorInit)
							}}
							active={(init?.position || defaultInit.position) !== defaultInit.position}
						/>
					</div>
				</OptionField>

				{/* Color */}
				<OptionField>
					<span>{gvar.gsm.token.color}</span>
					<div className="grid grid-cols-[repeat(3,max-content)] items-center gap-2.5">
						<input
							type="color"
							aria-label={gvar.gsm.token.color}
							value={init?.backgroundColor || defaultInit.backgroundColor}
							onChange={(e) => {
								const indicatorInit = produce(init ?? {}, (d) => {
									d.backgroundColor = e.target.value
									d.key = randomId()
								})
								showIndicator(indicatorInit, props.forCircle)
								onChange(indicatorInit)
							}}
						/>
						<input
							type="color"
							aria-label={gvar.gsm.token.color}
							value={init?.textColor || defaultInit.textColor}
							onChange={(e) => {
								const indicatorInit = produce(init ?? {}, (d) => {
									d.textColor = e.target.value
									d.key = randomId()
								})
								showIndicator(indicatorInit, props.forCircle)
								onChange(indicatorInit)
							}}
						/>
						<Reset
							onClick={() => {
								const indicatorInit = produce(init ?? {}, (d) => {
									d.textColor = null
									d.backgroundColor = null
									d.key = randomId()
								})
								showIndicator(indicatorInit, props.forCircle)
								onChange(indicatorInit)
							}}
							active={
								(init?.textColor || defaultInit.textColor) !== defaultInit.textColor ||
								(init?.backgroundColor || defaultInit.backgroundColor) !== defaultInit.backgroundColor
							}
						/>
					</div>
				</OptionField>

				{/* Outline width */}
				<OptionField>
					<span>{gvar.gsm.token.outlineWidth}</span>
					<SliderMicro
						value={init?.outlineWidth ?? defaultInit.outlineWidth ?? 1}
						onChange={(v) => {
							const indicatorInit = produce(init ?? {}, (d) => {
								d.outlineWidth = v
								d.key = randomId()
							})
							showIndicator(indicatorInit, props.forCircle)
							onChange(indicatorInit)
						}}
						default={defaultInit.outlineWidth ?? 1}
						sliderMin={0}
						sliderMax={2}
						sliderStep={0.01}
					/>
				</OptionField>

				{/* Size */}
				<OptionField>
					<span>{gvar.gsm.token.size}</span>
					<SliderMicro
						value={init?.scaling ?? defaultInit.scaling}
						onChange={(v) => {
							const indicatorInit = produce(init ?? {}, (d) => {
								d.scaling = v
								d.key = randomId()
							})
							showIndicator(indicatorInit, props.forCircle)
							onChange(indicatorInit)
						}}
						default={defaultInit.scaling}
						sliderMin={0.5}
						sliderMax={1.5}
						sliderStep={0.01}
					/>
				</OptionField>

				{/* Rounding */}
				<OptionField>
					<span>{gvar.gsm.token.rounding}</span>
					<SliderMicro
						value={init?.rounding ?? defaultInit.rounding}
						onChange={(v) => {
							const indicatorInit = produce(init ?? {}, (d) => {
								d.rounding = v
								d.key = randomId()
							})
							showIndicator(indicatorInit, props.forCircle)
							onChange(indicatorInit)
						}}
						default={defaultInit.rounding}
						sliderMin={0}
						sliderMax={4}
						sliderStep={0.01}
					/>
				</OptionField>

				{/* Offset */}
				{(init?.position || defaultInit.position) !== "C" && (
					<OptionField>
						<span>{gvar.gsm.token.offset}</span>
						<SliderMicro
							value={init?.offset ?? defaultInit.offset}
							onChange={(v) => {
								const indicatorInit = produce(init ?? {}, (d) => {
									d.offset = v
									d.key = randomId()
								})
								showIndicator(indicatorInit, props.forCircle)
								onChange(indicatorInit)
							}}
							default={defaultInit.offset}
							sliderMin={0}
							sliderMax={4}
							sliderStep={0.01}
						/>
					</OptionField>
				)}

				{/* Animation */}
				<OptionField>
					<span>{gvar.gsm.token.animation}</span>
					<div>
						<Select
							aria-label={gvar.gsm.token.animation}
							className="mr-2.5"
							value={`${init?.animation || 1}`}
							onChanged={(newValue) => {
								const indicatorInit = produce(init ?? {}, (d) => {
									d.animation = parseInt(newValue) as any
									d.key = randomId()
								})
								showIndicator(indicatorInit, props.forCircle, true)
								onChange(indicatorInit)
							}}
							options={[
								{ key: "1", value: gvar.gsm.token.default },
								{ key: "2", value: gvar.gsm.token.static },
								{ key: "3", value: gvar.gsm.token.shrink },
								{ key: "4", value: gvar.gsm.token.implode },
								{ key: "5", value: gvar.gsm.token.rotate },
							]}
						/>
						<Reset
							onClick={() => {
								const indicatorInit = produce(init ?? {}, (d) => {
									delete d.animation
									d.key = randomId()
								})
								showIndicator(indicatorInit, props.forCircle, true)
								onChange(indicatorInit)
							}}
							active={(init?.animation || 1) !== 1}
						/>
					</div>
				</OptionField>

				{/* Duration */}
				<OptionField>
					<span>{gvar.gsm.token.duration}</span>
					<div className="grid auto-cols-max grid-flow-col gap-x-2.5">
						<SliderMicro
							value={init?.duration ?? defaultInit.duration}
							onChange={(v) => {
								const indicatorInit = produce(init ?? {}, (d) => {
									d.duration = v
									d.key = randomId()
								})
								onChange(indicatorInit)
							}}
							default={defaultInit.duration}
							sliderMin={0.1}
							sliderMax={1.9}
							sliderStep={0.01}
							pass={{ onMouseUp: (v) => showIndicator(init, props.forCircle, true) }}
						/>
					</div>
				</OptionField>

				{/* Reset */}
				<Button
					size="lg"
					onClick={(e) => {
						onChange(null)
					}}
				>
					{gvar.gsm.token.reset}
				</Button>
			</ModalContent>
		</ModalBase>
	)
}

function showIndicator(init: IndicatorInit, forCircle: boolean, realDuration?: boolean) {
	if (gvar.indicator && Boolean(gvar.indicator.forCircle) !== Boolean(forCircle)) {
		gvar.indicator.release()
		delete gvar.indicator
	}
	gvar.indicator = gvar.indicator || new Indicator(forCircle)
	gvar.indicator.setInit({ ...init, duration: realDuration ? init?.duration : 3, animation: realDuration ? init?.animation : 2 })
	gvar.indicator.show({ text: "1.00" })
}
