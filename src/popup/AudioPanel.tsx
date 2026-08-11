import { useRef, useState } from "react"
import { FaArrowsAltH, FaMusic, FaVolumeUp } from "react-icons/fa"
import { GiAnticlockwiseRotation } from "react-icons/gi"
import { MdAccessTime } from "react-icons/md"
import { initTabCapture, releaseTabCapture } from "@/background/utils/tabCapture"
import { TabButton } from "@/comps/TabButton"
import { ToggleButton } from "@/comps/ToggleButton"
import { Tooltip } from "@/comps/Tooltip"
import { gvar } from "@/globalVar"
import { cn, produce } from "@/utils/helper"
import { SliderPlus } from "../comps/SliderPlus"
import { getDefaultAudioFx } from "../defaults"
import { useCaptureStatus } from "../hooks/useCaptureStatus"
import { useStateView } from "../hooks/useStateView"
import { EqualizerControl } from "./EqualizerControl"
import { ReverseButton } from "./ReverseButton"

export function AudioPanel(props: {}) {
	const [view, setView] = useStateView({ audioFx: true, audioFxAlt: true, monoOutput: true, audioPan: true })
	const env = useRef({ viaButton: true }).current
	let [rightTab, setRightTab] = useState(false)
	const status = useCaptureStatus()

	if (!view) return <div className="min-h-[40px] p-[8px]" />

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
		<div className="min-h-[40px] bg-background p-[8px] text-[0.928rem]">
			{/* Capture button */}
			<ToggleButton
				active={status}
				colored
				className="mt-[10px] mb-[10px] w-full border-[3px] p-[5px] text-[1.3em]"
				onClick={(e) => {
					env.viaButton = true
					status ? releaseTabCapture(gvar.tabInfo.tabId) : initTabCapture(gvar.tabInfo.tabId)
				}}
			>
				{status ? gvar.gsm.audio.releaseTab : gvar.gsm.command.afxCapture}
			</ToggleButton>

			<div className="mb-[10px] grid grid-cols-[1fr_max-content_1fr] gap-x-[4px]">
				{/* Split */}
				<Tooltip title={gvar.gsm.audio.splitTooltip}>
					<ToggleButton
						active={!!view.audioFxAlt}
						className="w-full border-2"
						onClick={() => {
							setView(
								produce(view, (d) => {
									d.audioFxAlt = d.audioFxAlt ? null : structuredClone(view.audioFx || getDefaultAudioFx())
								}),
							)
						}}
					>
						{gvar.gsm.audio.split}
					</ToggleButton>
				</Tooltip>

				{/* Reset */}
				<Tooltip title={gvar.gsm.token.reset}>
					<button
						className={cn(
							"reset toggle w-full rounded-[5px] border-2 text-foreground/50 opacity-70",
							(view.audioFx || view.audioFxAlt || status) && "active enabled:border-border-xx enabled:text-foreground enabled:opacity-100",
						)}
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
					<ToggleButton
						active={view.monoOutput}
						className="w-full border-2"
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
					</ToggleButton>
				</Tooltip>
			</div>

			{/* Split tabs */}
			{!!view.audioFxAlt && (
				<div className="mb-[10px] grid grid-cols-2">
					<TabButton
						open={!rightTab}
						onClick={(e) => {
							setRightTab(false)
						}}
					>
						{gvar.gsm.token.left}
					</TabButton>
					<TabButton
						open={rightTab}
						onClick={(e) => {
							setRightTab(true)
						}}
					>
						{gvar.gsm.token.right}
					</TabButton>
				</div>
			)}

			{/* Pitch control */}
			<SliderPlus
				label={
					<div>
						<FaMusic size="1.21rem" />
						<span className="ml-[10px]">{gvar.gsm.command.afxPitch}</span>
						<Tooltip title={gvar.gsm.audio.pitchHdTooltip}>
							<ToggleButton
								active={!starAudioFx.jungleMode}
								className="ml-[10px] px-[5px] py-0 text-[0.9em]"
								onClick={(e) => {
									setView(
										produce(view, (d) => {
											ensureStar(d).jungleMode = !starAudioFx.jungleMode
										}),
									)
								}}
							>
								HD
							</ToggleButton>
						</Tooltip>
					</div>
				}
				className="mb-[20px]"
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
						<span className="ml-[10px]">{gvar.gsm.command.afxGain}</span>
					</div>
				}
				className="mb-[20px]"
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
						<span className="ml-[10px]">{gvar.gsm.command.afxPan}</span>
					</div>
				}
				className="mb-[20px]"
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
						<span className="ml-[10px]">{gvar.gsm.command.afxDelay}</span>
						<Tooltip title={gvar.gsm.token.mergeBoth}>
							<ToggleButton
								active={starAudioFx.delayMerge}
								className="ml-[10px] px-[5px] py-0 text-[0.9em]"
								onClick={(e) => {
									setView(
										produce(view, (d) => {
											ensureStar(d).delayMerge = !starAudioFx.delayMerge
										}),
									)
								}}
							>
								+
							</ToggleButton>
						</Tooltip>
					</div>
				}
				className="mb-[20px]"
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
			<ReverseButton className="mb-[10px]" onActivate={ensureCaptured} />

			{/* EQ */}
			<EqualizerControl
				className="mb-[10px]"
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
