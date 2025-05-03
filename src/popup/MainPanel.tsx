import { conformSpeed } from "../utils/configUtils"
import { SpeedControl } from "./SpeedControl"
import { MediaView } from "./MediaView"
import { useStateView } from "../hooks/useStateView"
import { useMediaWatch } from "../hooks/useMediaWatch"
import { QrPromo } from "./QrPromo"


export function MainPanel(props: {}) {
  const [view, setView] = useStateView({speed: true, hideMediaView: true, enabled: true, speedChangeCounter: true})
  if (!view) return <div className="panel unloaded"></div>

  return (
    <div className="MainPanel panel">
      <SpeedControl speed={view.speed} onChange={v => {
        setView({
          speed: conformSpeed(v),
          enabled: true,
          latestViaShortcut: false,
          speedChangeCounter: (view.speedChangeCounter || 0) + 1
        })
      }}/>
      {view.hideMediaView ? null : <MediaViews/>}
      {<QrPromo/>}
    </div>
  )
}



export function MediaViews(props: {}) {
  const watchInfo = useMediaWatch()

  if (!watchInfo?.infos?.length) return 

  return (
    <div className="MediaViews">
      {watchInfo.infos.map(info => (
        <MediaView key={info.key} info={info} pinned={info.key === watchInfo.pinned?.key}/>
      ))}
    </div>
  )
}