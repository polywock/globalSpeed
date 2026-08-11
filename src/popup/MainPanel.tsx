import { useMediaWatch } from "../hooks/useMediaWatch"
import { useStateView } from "../hooks/useStateView"
import { conformSpeed } from "../utils/configUtils"
import { MediaView } from "./MediaView"
import { QrPromo } from "./QrPromo"
import { SelfPromo } from "./SelfPromo"
import { SpeedControl } from "./SpeedControl"

export function MainPanel(props: {}) {
	const [view, setView] = useStateView({ speed: true, hideMediaView: true, enabled: true, speedChangeCounter: true })
	if (!view) return <div className="min-h-[40px] p-[8px]" />

	return (
		<div className="min-h-[40px] p-[8px]">
			<SpeedControl
				speed={view.speed}
				onChange={(v) => {
					setView({
						speed: conformSpeed(v),
						enabled: true,
						latestViaShortcut: false,
						speedChangeCounter: (view.speedChangeCounter || 0) + 1,
					})
				}}
			/>
			{view.hideMediaView ? null : <MediaViews />}
			{<QrPromo />}
			{<SelfPromo />}
		</div>
	)
}

export function MediaViews(props: {}) {
	const watchInfo = useMediaWatch()

	if (!watchInfo?.infos?.length) return

	return (
		<div className="pl-[5px] select-none">
			{watchInfo.infos.map((info) => (
				<MediaView key={info.key} info={info} pinned={info.key === watchInfo.pinned?.key} />
			))}
		</div>
	)
}
