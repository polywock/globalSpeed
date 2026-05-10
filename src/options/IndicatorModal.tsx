import { Reset } from "@/comps/Reset"
import { SliderMicro } from "@/comps/SliderMicro"
import { Indicator } from "@/contentScript/isolated/utils/Indicator"
import { produce, randomId } from "@/utils/helper"
import { ModalBase } from "../comps/ModalBase"
import { INDICATOR_CIRCLE_INIT, INDICATOR_INIT } from "../defaults"
import { IndicatorInit } from "../types"
import "./IndicatorModal.css"

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
			<div className="IndicatorModal ModalMain">
				{/* Position */}
				<div className="field">
					<span>{gvar.gsm.token.position}</span>
					<div>
						<select
							aria-label={gvar.gsm.token.position}
							style={{ marginRight: "10px" }}
							value={init?.position ?? defaultInit.position}
							onChange={(e) => {
								const indicatorInit = produce(init ?? {}, (d) => {
									d.position = e.target.value as any
									d.key = randomId()
								})
								showIndicator(indicatorInit, props.forCircle)
								onChange(indicatorInit)
							}}
						>
							<option value="TL">{gvar.gsm.token.topLeft}</option>
							<option value="TR">{gvar.gsm.token.topRight}</option>
							<option value="BL">{gvar.gsm.token.bottomLeft}</option>
							<option value="BR">{gvar.gsm.token.bottomRight}</option>
							<option value="C">{gvar.gsm.token.center}</option>
						</select>
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
				</div>

				{/* Color */}
				<div className="field">
					<span>{gvar.gsm.token.color}</span>
					<div className="colorControl">
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
				</div>

				{/* Size */}
				<div className="field">
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
				</div>

				{/* Rounding */}
				<div className="field">
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
				</div>

				{/* Offset */}
				{(init?.position || defaultInit.position) !== "C" && (
					<div className="field">
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
					</div>
				)}

				{/* Animation */}
				<div className="field">
					<span>{gvar.gsm.token.animation}</span>
					<div>
						<select
							aria-label={gvar.gsm.token.animation}
							style={{ marginRight: "10px" }}
							value={init?.animation || 1}
							onChange={(e) => {
								const indicatorInit = produce(init ?? {}, (d) => {
									d.animation = parseInt(e.target.value) as any
									d.key = randomId()
								})
								showIndicator(indicatorInit, props.forCircle, true)
								onChange(indicatorInit)
							}}
						>
							<option value="1">{gvar.gsm.token.default}</option>
							<option value="2">{gvar.gsm.token.static}</option>
							<option value="3">{gvar.gsm.token.shrink}</option>
							<option value="4">{gvar.gsm.token.implode}</option>
							<option value="5">{gvar.gsm.token.rotate}</option>
						</select>
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
				</div>

				{/* Duration */}
				<div className="field">
					<span>{gvar.gsm.token.duration}</span>
					<div className="col" style={{ gridColumnGap: "10px" }}>
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
				</div>

				{/* Reset */}
				<button
					onClick={(e) => {
						onChange(null)
					}}
					className="reset"
				>
					{gvar.gsm.token.reset}
				</button>
			</div>
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
