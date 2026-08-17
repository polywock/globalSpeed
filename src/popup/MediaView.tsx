import { type CSSProperties } from "react"
import { FaBackward, FaForward, FaMousePointer, FaPause, FaPlay } from "react-icons/fa"
import { GrRevert } from "react-icons/gr"
import { IoMdVolumeHigh, IoMdVolumeLow, IoMdVolumeOff } from "react-icons/io"
import { MdPictureInPictureAlt } from "react-icons/md"
import { SliderInput } from "@/comps/Slider"
import { Tooltip } from "@/comps/Tooltip"
import { gvar } from "@/globalVar"
import type { MediaEvent } from "../contentScript/isolated/utils/applyMediaEvent"
import { FlatMediaInfo, MediaPath } from "../contentScript/isolated/utils/genMediaInfo"
import { sendMediaEvent } from "../utils/configUtils"
import { clamp, cn, feedbackText, formatDomain, formatDuration } from "../utils/helper"

const HAS_REQUEST_PIP = !!HTMLVideoElement.prototype.requestPictureInPicture
const CONTROL_BUTTON_CLASS = "icon-button p-1.25 first:-ml-1.25 hover:bg-accent"

export function MediaView(props: { info: FlatMediaInfo; pinned: boolean }) {
	const { info, pinned } = props
	const { tabId, frameId, windowId } = info.tabInfo

	let parts: string[] = [info.displayDomain || formatDomain(info.domain)]

	if (!info.infinity && info.duration) parts.push(formatDuration(info.duration))

	const differentTab = gvar.tabInfo && gvar.tabInfo.tabId !== tabId

	return (
		<div className="border-t border-border px-1.25 py-2.5 first:mt-4">
			{/* Header */}
			<div className="mb-0.5 wrap-anywhere">
				<span
					onClick={async (e) => {
						let probe = await chrome.tabs.sendMessage(info.tabInfo.tabId, { type: "MEDIA_PROBE", key: info.key, formatted: true } as Messages, {
							frameId: info.tabInfo.frameId || 0,
						})
						if (!probe) return
						feedbackText(probe.formatted, { y: (e.target as HTMLDivElement).getBoundingClientRect().top - 50 }, 1000 * 30)
					}}
					className="text-xs opacity-55 hover:underline hover:opacity-100"
					title={info.domain}
				>
					{parts.join(info.shadowMode == null ? " - " : ` • `)}
				</span>
				{differentTab && (
					<Tooltip title={gvar.gsm.token.jumpToTab}>
						<button
							className="ml-1.25 -translate-y-0.5 scale-120 icon-button rounded-control px-1.25 py-0 opacity-70 hover:bg-accent hover:opacity-100"
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
			<div className="grid grid-cols-[repeat(4,max-content)_1fr_repeat(3,max-content)] items-center gap-x-1.25" key={info.key}>
				{/* Seek back */}
				<button
					className={cn(CONTROL_BUTTON_CLASS)}
					onClick={(e) => {
						const event: MediaEvent = { type: "SEEK", value: -5, relative: true }
						sendMediaEvent(event, info.key, tabId, frameId)
					}}
				>
					{/* <FaStepBackward className="size-4" /> */}
					<FaBackward className="size-3.5 opacity-75" />
				</button>

				{/* Pause */}
				<button
					className={CONTROL_BUTTON_CLASS}
					onClick={(e) => {
						const event: MediaEvent = { type: "PAUSE", state: "toggle" }
						sendMediaEvent(event, info.key, tabId, frameId)
					}}
				>
					{info.paused ? <FaPlay className="size-4.75" /> : <FaPause className="size-4.75" />}
				</button>

				{/* Seek forwards */}
				<button
					className={cn(CONTROL_BUTTON_CLASS)}
					onClick={(e) => {
						const event: MediaEvent = { type: "SEEK", value: 5, relative: true }
						sendMediaEvent(event, info.key, tabId, frameId)
					}}
				>
					{/* <FaStepForward className="size-4" /> */}
					<FaForward className="size-3.5" />
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
							className={cn(CONTROL_BUTTON_CLASS, "opacity-85 hover:opacity-100")}
							onClick={(e) => {
								const event: MediaEvent = { type: "MUTE", state: "toggle" }
								sendMediaEvent(event, info.key, tabId, frameId)
							}}
						>
							{info.muted ? (
								<IoMdVolumeOff className="size-5" />
							) : info.volume > 0.5 ? (
								<IoMdVolumeHigh className="size-5" />
							) : (
								<IoMdVolumeLow className="size-5" />
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
							className={cn(CONTROL_BUTTON_CLASS, "opacity-75", info.pipMode && "text-primary opacity-100")}
							onClick={(e) => {
								const event: MediaEvent = e.shiftKey ? { type: "FULLSCREEN", direct: true } : { type: "PIP" }
								sendMediaEvent(event, info.key, tabId, frameId)
							}}
						>
							<MdPictureInPictureAlt className="size-4" />
							{/* <LuPictureInPicture2 className="size-4" /> */}
						</button>
					</Tooltip>
				)}

				{/* Select */}
				<Tooltip title={gvar.gsm.warnings.selectTooltip}>
					<button
						// title={gvar.gsm.warnings.selectTooltip}
						className={cn(CONTROL_BUTTON_CLASS, "opacity-75", pinned && "text-primary opacity-100")}
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
						<FaMousePointer className="size-4" />
						{/* <LuMousePointer className="size-4" /> */}
					</button>
				</Tooltip>
			</div>
		</div>
	)
}
