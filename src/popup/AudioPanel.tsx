import { useRef, useState } from "react"
import { FaArrowsAltH, FaMusic, FaVolumeUp } from "react-icons/fa"
import { GiAnticlockwiseRotation } from "react-icons/gi"
import { MdAccessTime } from "react-icons/md"
import { initTabCapture, releaseTabCapture } from "@/background/utils/tabCapture"
import { Tooltip } from "@/comps/Tooltip"
import { produce } from "@/utils/helper"
import { SliderPlus } from "../comps/SliderPlus"
import { getDefaultAudioFx } from "../defaults"
import { useCaptureStatus } from "../hooks/useCaptureStatus"
import { useStateView } from "../hooks/useStateView"
import { EqualizerControl } from "./EqualizerControl"
import { ReverseButton } from "./ReverseButton"
import "./AudioPanel.css"

export function AudioPanel(props: {}) {
	const [view, setView] = useStateView({ audioFx: true, audioFxAlt: true, monoOutput: true, audioPan: true })
	const env = useRef({ viaButton: true }).current
	let [rightTab, setRightTab] = useState(false)
	const status = useCaptureStatus()

	if (!view) return <div className="panel unloaded"></div>

	if (!view.audioFxAlt) {
		rightTab = false
	}

	let starAudioFx = (rightTab ? view.audioFxAlt : view.audioFx) || getDefaultAudioFx()
	let starKey: "audioFxAlt" | "audioFx" = rightTab ? "audioFxAlt" : "audioFx"
	const ensureStar = (d: typeof view) => (d[starKey] = d[starKey] || getDefaultAudioFx())
	const ensureCaptured = async () => {
		setTimeout(() => setView({ enabled: true }), 0.1)
		if (status) return status
		env.viaButton = false
		return initTabCapture(gvar.tabInfo.tabId)
	}

	return (
		<div className="AudioPanel panel">
			{/* Capture button */}
			<button
				className={`colored toggle capture ${status ? "active" : ""}`}
				onClick={(e) => {
					env.viaButton = true
					status ? releaseTabCapture(gvar.tabInfo.tabId) : initTabCapture(gvar.tabInfo.tabId)
				}}
			>
				{status ? gvar.gsm.audio.releaseTab : gvar.gsm.command.afxCapture}
			</button>

			<div className="mainControls">
				{/* Split */}
				<Tooltip title={gvar.gsm.audio.splitTooltip}>
					<button
						className={`toggle ${view.audioFxAlt ? "active" : ""}`}
						onClick={() => {
							setView(
								produce(view, (d) => {
									d.audioFxAlt = d.audioFxAlt ? null : structuredClone(view.audioFx || getDefaultAudioFx())
								}),
							)
						}}
					>
						{gvar.gsm.audio.split}
					</button>
				</Tooltip>

				{/* Reset */}
				<Tooltip title={gvar.gsm.token.reset}>
					<button
						className={`toggle reset ${view.audioFx || view.audioFxAlt || status ? "active" : ""}`}
						onClick={() => {
							releaseTabCapture(gvar.tabInfo.tabId)
							setView(
								produce(view, (d) => {
									d.audioFx = null
									d.audioFxAlt = null
									d.audioPan = null
								}),
							)
						}}
					>
						<GiAnticlockwiseRotation size="1.1rem" />
					</button>
				</Tooltip>

				{/* Mono */}
				<Tooltip title={gvar.gsm.command.afxMonoTooltip}>
					<button
						className={`toggle ${view.monoOutput ? "active" : ""}`}
						onClick={() => {
							setView(
								produce(view, (d) => {
									d.monoOutput = !d.monoOutput
									d.monoOutput && ensureCaptured()
								}),
							)
						}}
					>
						{gvar.gsm.command.afxMono}
					</button>
				</Tooltip>
			</div>

			{/* Split tabs */}
			{!!view.audioFxAlt && (
				<div className="tabs">
					<button
						className={!rightTab ? "open" : ""}
						onClick={(e) => {
							setRightTab(false)
						}}
					>
						{gvar.gsm.token.left}
					</button>
					<button
						className={rightTab ? "open" : ""}
						onClick={(e) => {
							setRightTab(true)
						}}
					>
						{gvar.gsm.token.right}
					</button>
				</div>
			)}

			{/* Pitch control */}
			<SliderPlus
				label={
					<div>
						<FaMusic size="1.21rem" />
						<span style={{ marginLeft: "10px" }}>{gvar.gsm.command.afxPitch}</span>
						<Tooltip title={gvar.gsm.audio.pitchHdTooltip}>
							<button
								style={{ marginLeft: "10px" }}
								className={`micro toggle ${starAudioFx.jungleMode ? "" : "active"}`}
								onClick={(e) => {
									setView(
										produce(view, (d) => {
											ensureStar(d).jungleMode = !starAudioFx.jungleMode
										}),
									)
								}}
							>
								HD
							</button>
						</Tooltip>
					</div>
				}
				value={starAudioFx.pitch ?? 1}
				sliderMin={-6}
				sliderMax={6}
				min={-100}
				max={100}
				sliderStep={0.1}
				default={0}
				onChange={(newValue) => {
					setView(
						produce(view, (d) => {
							ensureStar(d).pitch = newValue
						}),
					)
					newValue !== 0 && ensureCaptured()
				}}
			/>

			{/* Gain control */}
			<SliderPlus
				label={
					<div>
						<FaVolumeUp size="1.21rem" />
						<span style={{ marginLeft: "10px" }}>{gvar.gsm.command.afxGain}</span>
					</div>
				}
				value={starAudioFx.volume ?? 1}
				sliderMin={0}
				sliderMax={3}
				min={0}
				default={1}
				onChange={(newValue) => {
					setView(
						produce(view, (d) => {
							ensureStar(d).volume = newValue
						}),
					)
					newValue !== 1 && ensureCaptured()
				}}
			/>

			{/* Pan control */}
			<SliderPlus
				label={
					<div>
						<FaArrowsAltH size="1.21rem" />
						<span style={{ marginLeft: "10px" }}>{gvar.gsm.command.afxPan}</span>
					</div>
				}
				value={view.audioPan ?? 0}
				sliderMin={-1}
				sliderMax={1}
				min={-1}
				default={0}
				onChange={(newValue) => {
					setView(
						produce(view, (d) => {
							d.audioPan = newValue
						}),
					)
					newValue !== 0 && ensureCaptured()
				}}
			/>

			{/* Delay control */}
			<SliderPlus
				label={
					<div>
						<MdAccessTime size="1.42rem" />
						<span style={{ marginLeft: "10px" }}>{gvar.gsm.command.afxDelay}</span>
						<Tooltip title={gvar.gsm.token.mergeBoth}>
							<button
								style={{ marginLeft: "10px" }}
								className={`micro toggle ${starAudioFx.delayMerge ? "active" : ""}`}
								onClick={(e) => {
									setView(
										produce(view, (d) => {
											ensureStar(d).delayMerge = !starAudioFx.delayMerge
										}),
									)
								}}
							>
								+
							</button>
						</Tooltip>
					</div>
				}
				value={starAudioFx.delay ?? 0}
				sliderMin={0}
				sliderMax={5}
				min={0}
				max={179}
				default={0}
				onChange={(newValue) => {
					setView(
						produce(view, (d) => {
							ensureStar(d).delay = newValue
						}),
					)
					newValue !== 0 && ensureCaptured()
				}}
			/>

			{/* Reverse */}
			{<ReverseButton onActivate={ensureCaptured} />}

			{/* EQ */}
			<EqualizerControl
				value={starAudioFx.eq}
				onChange={(newValue) => {
					setView(
						produce(view, (d) => {
							ensureStar(d).eq = newValue
						}),
					)
					newValue.enabled && ensureCaptured()
				}}
			/>
		</div>
	)
}
