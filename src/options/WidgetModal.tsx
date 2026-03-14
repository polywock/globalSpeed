import { produce } from "immer"
import { GoX } from "react-icons/go"
import { NumericInput } from "@/comps/NumericInput"
import { RegularTooltip } from "@/comps/RegularTooltip"
import { SliderMicro } from "@/comps/SliderMicro"
import { Toggle } from "@/comps/Toggle"
import { MAX_SPEED_CHROMIUM, MIN_SPEED_CHROMIUM } from "@/defaults/constants"
import { randomId } from "@/utils/helper"
import { ModalBase } from "../comps/ModalBase"
import { useStateView } from "../hooks/useStateView"
import "./WidgetModal.css"
import { useState } from "react"
import { GearIcon } from "@/comps/GearIcon"
import { IndicatorModal } from "./IndicatorModal"

type Props = {
	onClose: () => void
}

export function WidgetModal(props: Props) {
	const [view, setView] = useStateView({ circleInit: true })
	const [showIndicatorModal, setShowIndicatorModal] = useState(false)
	if (!view) return null
	let init = view.circleInit || {}

	return (
		<ModalBase keepOnWheel={true} onClose={props.onClose}>
			<div className="WidgetModal ModalMain">
				{showIndicatorModal && (
					<IndicatorModal
						forCircle={true}
						indicator={init.indicatorInit}
						onChange={(indicatorInit) => {
							setView({
								circleInit: produce(init, (d) => {
									d.indicatorInit = indicatorInit
									d.key = randomId()
								}),
							})
						}}
						onClose={() => setShowIndicatorModal(null)}
					/>
				)}

				{/* Size */}
				<div className="field">
					<span>{gvar.gsm.token.size}</span>
					<SliderMicro
						value={init.circleSize ?? 45}
						onChange={(v) => {
							setView({
								circleInit: produce(init, (d) => {
									d.circleSize = v
									d.key = randomId()
								}),
							})
						}}
						default={45}
						sliderMin={5}
						sliderMax={140}
						sliderStep={1}
					/>
				</div>

				{/* Opacity */}
				<div className="field">
					<span>{gvar.gsm.filter.opacity}</span>
					<SliderMicro
						value={init.opacity ?? 0.5}
						onChange={(v) => {
							setView({
								circleInit: produce(init, (d) => {
									d.opacity = v
									d.key = randomId()
								}),
							})
						}}
						default={0.5}
						sliderMin={0.1}
						sliderMax={0.6}
						sliderStep={0.01}
					/>
				</div>

				{/* Auto hide */}
				<div className="field">
					<span>{gvar.gsm.options.flags.widget.autoHide}</span>
					<Toggle
						value={!init.autoHideDisabled}
						onChange={(e) => {
							setView({
								circleInit: produce(init, (d) => {
									d.autoHideDisabled = !d.autoHideDisabled
									d.key = randomId()
								}),
							})
						}}
					/>
				</div>

				{/* Fullscreen only */}
				<div className="field">
					<div className="labelWithTooltip">
						<span>{gvar.gsm.options.flags.widget.fullscreenOnly}</span>
						<RegularTooltip title={gvar.gsm.options.flags.widget.fullscreenOnlyTooltip} align="right" />
					</div>
					<Toggle
						value={init.fullscreenOnly}
						onChange={(e) => {
							setView({
								circleInit: produce(init, (d) => {
									d.fullscreenOnly = !d.fullscreenOnly
									d.key = randomId()
								}),
							})
						}}
					/>
				</div>

				{/* Show indicator */}
				<div className="field indentFloat">
					<span>{gvar.gsm.options.flags.showIndicator}</span>
					<div className="fieldValue">
						<Toggle
							value={!init.hideIndicator}
							onChange={async (e) => {
								setView({
									circleInit: produce(init, (d) => {
										d.hideIndicator = !d.hideIndicator
										d.key = randomId()
									}),
								})
							}}
						/>
						<div className="float">
							{init.hideIndicator ? null : (
								<>
									<GearIcon onClick={() => setShowIndicatorModal(true)} />
								</>
							)}
						</div>
					</div>
				</div>

				{/* Press action */}
				<div className="field">
					<span>{gvar.gsm.options.flags.widget.pressAction}</span>
					<select
						value={init.mainAction || "SPEED"}
						onChange={(e) => {
							setView({
								circleInit: produce(init, (d) => {
									d.mainAction = e.target.value as any
									d.key = randomId()
								}),
							})
						}}
					>
						<option value="SPEED">{gvar.gsm.command.toggleSpeed}</option>
						<option value="PAUSE">{gvar.gsm.options.flags.widget.togglePause}</option>
						<option value="SKIP_FORWARDS">{gvar.gsm.options.flags.widget.skipForward}</option>
						<option value="SKIP_BACKWARDS">{gvar.gsm.options.flags.widget.skipBackward}</option>
					</select>
				</div>

				{/* Speed  */}
				{(init.mainAction || "SPEED") === "SPEED" && (
					<div className="field">
						<span>{gvar.gsm.command.speed}</span>
						<NumericInput
							rounding={2}
							noNull={true}
							min={MIN_SPEED_CHROMIUM}
							max={MAX_SPEED_CHROMIUM}
							value={init.mainActionSpeed ?? 3}
							onChange={(v) => {
								setView({
									circleInit: produce(init, (d) => {
										d.mainActionSpeed = v
										d.key = randomId()
									}),
								})
							}}
						/>
					</div>
				)}

				{/* Fixed Seek Step */}
				<div className="field">
					<div className="labelWithTooltip">
						<span>{gvar.gsm.options.flags.widget.fixedSeekStep}</span>
						<RegularTooltip title={gvar.gsm.options.flags.widget.fixedSeekStepTooltip} align="right" />
					</div>
					{init.fixedSeekStep ? (
						<div className="control">
							<NumericInput
								rounding={2}
								noNull={true}
								min={1}
								value={init.fixedSeekStep}
								onChange={(v) => {
									setView({
										circleInit: produce(init, (d) => {
											d.fixedSeekStep = v
											d.key = randomId()
										}),
									})
								}}
							/>
							<button
								className="icon"
								onClick={() => {
									setView({
										circleInit: produce(init, (d) => {
											delete d.fixedSeekStep
											d.key = randomId()
										}),
									})
								}}
							>
								<GoX size="1.6rem" />
							</button>
						</div>
					) : (
						<Toggle
							value={false}
							onChange={() =>
								setView({
									circleInit: produce(init, (d) => {
										d.fixedSeekStep = 5
										d.key = randomId()
									}),
								})
							}
						/>
					)}
				</div>

				{/* Fixed Speed Step */}
				<div className="field">
					<div className="labelWithTooltip">
						<span>{gvar.gsm.options.flags.widget.fixedSpeedStep}</span>
						<RegularTooltip title={gvar.gsm.options.flags.widget.fixedSpeedStepTooltip} align="right" />
					</div>
					{init.fixedSpeedStep ? (
						<div className="control">
							<NumericInput
								rounding={2}
								noNull={true}
								min={0.01}
								max={1}
								value={init.fixedSpeedStep}
								onChange={(v) => {
									setView({
										circleInit: produce(init, (d) => {
											d.fixedSpeedStep = v
											d.key = randomId()
										}),
									})
								}}
							/>
							<button
								className="icon"
								onClick={() => {
									setView({
										circleInit: produce(init, (d) => {
											delete d.fixedSpeedStep
											d.key = randomId()
										}),
									})
								}}
							>
								<GoX size="1.6rem" />
							</button>
						</div>
					) : (
						<Toggle
							value={false}
							onChange={() =>
								setView({
									circleInit: produce(init, (d) => {
										d.fixedSpeedStep = 0.1
										d.key = randomId()
									}),
								})
							}
						/>
					)}
				</div>

				{/* Reset */}
				<button
					onClick={(e) => {
						setView({ circleInit: null })
					}}
					className="reset"
				>
					{gvar.gsm.token.reset}
				</button>
			</div>
		</ModalBase>
	)
}
