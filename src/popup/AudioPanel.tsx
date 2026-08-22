import { useRef, useState } from "react"
import { FaArrowsAltH, FaMusic, FaVolumeUp } from "react-icons/fa"
import { GiAnticlockwiseRotation } from "react-icons/gi"
import { LuMerge } from "react-icons/lu"
import { MdAccessTime } from "react-icons/md"
import { initTabCapture, releaseTabCapture } from "@/background/utils/tabCapture"
import { TabButton } from "@/comps/TabButton"
import { ToggleButton } from "@/comps/ToggleButton"
import { Tooltip } from "@/comps/Tooltip"
import { gvar } from "@/globalVar"
import { usePageReachable } from "@/hooks/usePageReachable"
import { produce } from "@/utils/helper"
import { SliderPlus } from "../comps/SliderPlus"
import { getDefaultAudioFx } from "../defaults"
import { useCaptureStatus } from "../hooks/useCaptureStatus"
import { useStateView } from "../hooks/useStateView"
import { EqualizerControl } from "./EqualizerControl"
import { InsertItcButton } from "./InsertItcButton"
import { ReverseButton } from "./ReverseButton"

export function AudioPanel(props: {}) {
	const [view, setView] = useStateView({ audioFx: true, audioFxAlt: true, monoOutput: true, audioPan: true })
	const env = useRef({ viaButton: true }).current
	let [rightTab, setRightTab] = useState(false)
	const status = useCaptureStatus()
	const pageReachable = usePageReachable()

	if (!view) return <div className="popup-panel" />

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
		<div className="popup-panel bg-background text-md">
			{/* Capture button, with the reset that undoes it */}
			<div className="mt-2.5 mb-2.5 grid grid-cols-[1fr_max-content] gap-x-1">
				<ToggleButton
					active={status}
					tone="accent"
					className="w-full rounded-xl border-2 p-1.25 text-2xl"
					onClick={(e) => {
						env.viaButton = true
						status ? releaseTabCapture(gvar.tabInfo.tabId) : initTabCapture(gvar.tabInfo.tabId)
					}}
				>
					{status ? gvar.gsm.audio.releaseTab : gvar.gsm.command.afxCapture}
				</ToggleButton>

				{/* Reset */}
				<Tooltip title={gvar.gsm.token.resetEverything}>
					<ToggleButton
						tone="accent"
						active={!!(view.audioFx || view.audioFxAlt || status)}
						className="h-full rounded-xl border-2 px-2.5"
						aria-label={gvar.gsm.token.resetEverything}
						onClick={() => {
							releaseTabCapture(gvar.tabInfo.tabId)
							setView(
								produce(view, (d) => {
									d.audioFx = null
									d.audioFxAlt = null
									d.audioPan = null
									d.monoOutput = null
								}),
							)
						}}
					>
						<GiAnticlockwiseRotation size="1.1rem" />
					</ToggleButton>
				</Tooltip>
			</div>

			<div className="mb-2.5 grid grid-cols-2 gap-x-1">
				{/* Split */}
				<Tooltip title={gvar.gsm.audio.splitTooltip}>
					<ToggleButton
						active={!!view.audioFxAlt}
						className="w-full rounded-xl border-2"
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

				{/* Mono */}
				<Tooltip title={gvar.gsm.command.afxMonoTooltip}>
					<ToggleButton
						active={view.monoOutput}
						className="w-full rounded-xl border-2"
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
				<div className="mb-2.5 grid grid-cols-2">
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
						<span className="ml-2.5">{gvar.gsm.command.afxPitch}</span>
						<Tooltip title={gvar.gsm.audio.pitchHdTooltip}>
							<ToggleButton
								active={!starAudioFx.jungleMode}
								className="ml-2.5 px-1 py-0 text-xs"
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
						{pageReachable && <InsertItcButton command="afxPitch" className="ml-2.5" />}
					</div>
				}
				className="mb-5"
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
						<span className="ml-2.5">{gvar.gsm.command.afxGain}</span>
						{pageReachable && <InsertItcButton command="afxGain" className="ml-2.5" />}
					</div>
				}
				className="mb-5"
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
						<span className="ml-2.5">{gvar.gsm.command.afxPan}</span>
						{pageReachable && <InsertItcButton command="afxPan" className="ml-2.5" />}
					</div>
				}
				className="mb-5"
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
						<span className="ml-2.5">{gvar.gsm.command.afxDelay}</span>
						<Tooltip title={gvar.gsm.token.mergeBoth}>
							<ToggleButton
								active={starAudioFx.delayMerge}
								className="ml-2.5 p-1 text-sm"
								onClick={(e) => {
									setView(
										produce(view, (d) => {
											ensureStar(d).delayMerge = !starAudioFx.delayMerge
										}),
									)
								}}
							>
								<LuMerge className="size-3" />
							</ToggleButton>
						</Tooltip>
						{pageReachable && <InsertItcButton command="afxDelay" className="ml-2.5" />}
					</div>
				}
				className="mb-5"
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
			<ReverseButton className="mb-2.5" onActivate={ensureCaptured} />

			{/* EQ */}
			<EqualizerControl
				className="mb-2.5"
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
