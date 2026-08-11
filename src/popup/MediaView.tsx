import { type CSSProperties } from "react"
import { FaBackward, FaForward, FaMousePointer, FaPause, FaPlay, FaVolumeDown, FaVolumeMute, FaVolumeUp } from "react-icons/fa"
import { GrRevert } from "react-icons/gr"
import { MdPictureInPictureAlt } from "react-icons/md"
import { SliderInput } from "@/comps/Slider"
import { Tooltip } from "@/comps/Tooltip"
import { gvar } from "@/globalVar"
import type { MediaEvent } from "../contentScript/isolated/utils/applyMediaEvent"
import { FlatMediaInfo, MediaPath } from "../contentScript/isolated/utils/genMediaInfo"
import { sendMediaEvent } from "../utils/configUtils"
import { clamp, cn, feedbackText, formatDomain, formatDuration } from "../utils/helper"

const HAS_REQUEST_PIP = !!HTMLVideoElement.prototype.requestPictureInPicture
const CONTROL_BUTTON_CLASS = "icon p-[5px] first:-ml-[5px] hover:bg-accent"

export function MediaView(props: { info: FlatMediaInfo; pinned: boolean }) {
	const { info, pinned } = props
	const { tabId, frameId, windowId } = info.tabInfo

	let parts: string[] = [info.displayDomain || formatDomain(info.domain)]

	if (!info.infinity && info.duration) parts.push(formatDuration(info.duration))

	const differentTab = gvar.tabInfo && gvar.tabInfo.tabId !== tabId

	return (
		<div className="border-t border-border-x px-[5px] py-[10px] first:mt-[16px] last:border-b last:[.noBottomBorderMediaItem_&]:border-b-0">
			{/* Header */}
			<div className="mb-[2px] [overflow-wrap:anywhere]">
				<span
					onClick={async (e) => {
						let probe = await chrome.tabs.sendMessage(info.tabInfo.tabId, { type: "MEDIA_PROBE", key: info.key, formatted: true } as Messages, {
							frameId: info.tabInfo.frameId || 0,
						})
						if (!probe) return
						feedbackText(probe.formatted, { y: (e.target as HTMLDivElement).getBoundingClientRect().top - 50 }, 1000 * 30)
					}}
					className="text-[0.85em] opacity-55 hover:underline hover:opacity-100"
					title={info.domain}
				>
					{parts.join(info.shadowMode == null ? " - " : ` • `)}
				</span>
				{differentTab && (
					<Tooltip title={gvar.gsm.token.jumpToTab}>
						<button
							className="ml-[5px] -translate-y-[2px] scale-120 rounded-[5px] border-0 px-[5px] py-0 opacity-70 hover:bg-accent hover:opacity-100 [&>svg]:opacity-100"
							onClick={async () => {
								const tabInfo = await chrome.tabs.get(tabId)
								if (tabInfo.windowId !== windowId) {
									chrome.windows.update(tabInfo.windowId, { focused: true })
								}
								chrome.tabs.update(tabId, { active: true })
							}}
						>
							<GrRevert />
						</button>
					</Tooltip>
				)}
				{info.displayTitle && (
					<div className="overflow-hidden text-ellipsis whitespace-nowrap" title={info.title}>
						{info.displayTitle}
					</div>
				)}
			</div>

			{/* Controls */}
			<div className="grid grid-cols-[repeat(4,max-content)_1fr_repeat(3,max-content)] items-center gap-x-[5px]" key={info.key}>
				{/* Seek back */}
				<button
					className={CONTROL_BUTTON_CLASS}
					onClick={(e) => {
						const event: MediaEvent = { type: "SEEK", value: -5, relative: true }
						sendMediaEvent(event, info.key, tabId, frameId)
					}}
				>
					<FaBackward size={"1.07rem"} />
				</button>

				{/* Pause */}
				<button
					className={CONTROL_BUTTON_CLASS}
					onClick={(e) => {
						const event: MediaEvent = { type: "PAUSE", state: "toggle" }
						sendMediaEvent(event, info.key, tabId, frameId)
					}}
				>
					{info.paused ? <FaPlay size={"1.14rem"} /> : <FaPause size={"1.14rem"} />}
				</button>

				{/* Seek forwards */}
				<button
					className={CONTROL_BUTTON_CLASS}
					onClick={(e) => {
						const event: MediaEvent = { type: "SEEK", value: 5, relative: true }
						sendMediaEvent(event, info.key, tabId, frameId)
					}}
				>
					<FaForward size={"1.07rem"} />
				</button>

				{/* Volume */}
				{!info.hasAudioTrack ? (
					<>
						<div />
						<div />
					</>
				) : (
					<>
						<button
							className={CONTROL_BUTTON_CLASS}
							onClick={(e) => {
								const event: MediaEvent = { type: "MUTE", state: "toggle" }
								sendMediaEvent(event, info.key, tabId, frameId)
							}}
						>
							{info.muted ? (
								<FaVolumeMute size={"1.14rem"} />
							) : info.volume > 0.5 ? (
								<FaVolumeUp size={"1.14rem"} />
							) : (
								<FaVolumeDown size={"1.14rem"} />
							)}
						</button>
						<SliderInput
							className="min-w-0"
							style={{ "--slider-progress": `${clamp(0, 1, info.volume) * 100}%` } as CSSProperties}
							onChange={(e) => {
								const event: MediaEvent = { type: "SET_VOLUME", value: e.target.valueAsNumber, relative: false }
								sendMediaEvent(event, info.key, tabId, frameId)
							}}
							min={0}
							max={1}
							step={0.1}
							value={info.volume}
						/>
					</>
				)}

				{/* PiP */}
				{!(HAS_REQUEST_PIP && info.hasVideoTrack && info.duration) ? (
					<div />
				) : (
					<Tooltip title={gvar.gsm.command.PiP}>
						<button
							className={cn(CONTROL_BUTTON_CLASS, "opacity-75", info.pipMode && "text-tertiary opacity-100")}
							onClick={(e) => {
								const event: MediaEvent = e.shiftKey ? { type: "FULLSCREEN", direct: true } : { type: "PIP" }
								sendMediaEvent(event, info.key, tabId, frameId)
							}}
						>
							<MdPictureInPictureAlt size={"1.285rem"} />
						</button>
					</Tooltip>
				)}

				{/* Select */}
				<Tooltip title={gvar.gsm.warnings.selectTooltip}>
					<button
						// title={gvar.gsm.warnings.selectTooltip}
						className={cn(CONTROL_BUTTON_CLASS, "opacity-75", pinned && "text-tertiary opacity-100")}
						onClick={(e) => {
							chrome.storage.session.set({
								[`m:pin`]: pinned
									? null
									: ({
											key: info.key,
											tabInfo: info.tabInfo,
										} as MediaPath),
							})
						}}
					>
						<FaMousePointer size={"1.285rem"} />
					</button>
				</Tooltip>
			</div>
		</div>
	)
}
