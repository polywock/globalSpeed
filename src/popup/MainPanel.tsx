import { conformSpeed } from "../utils/configUtils"
import { SpeedControl } from "./SpeedControl"
import { MediaView } from "./MediaView"
import { useStateView } from "../hooks/useStateView"
import { useMediaWatch } from "../hooks/useMediaWatch"


export function MainPanel(props: {}) {
  const [view, setView] = useStateView({speed: true, hideMediaView: true, enabled: true})
  if (!view) return <div className="panel unloaded"></div>

  return (
    <div className="MainPanel panel">
      <SpeedControl speed={view.speed} onChange={v => {
        setView({
          speed: conformSpeed(v),
          enabled: true,
          latestViaShortcut: false 
        })
      }}/>
      {view.hideMediaView ? null : <MediaViews/>}
    </div>
  )
}



export function MediaViews(props: {}) {
  const watchInfo = useMediaWatch()

  return (
    <>
      {(watchInfo?.infos || []).filter(info => info.isConnected || info.duration > 0.5 || info.key === watchInfo.pinned?.key).map(info => (
        <MediaView key={info.key} info={info} pinned={info.key === watchInfo.pinned?.key}/>
      ))}
    </>
  )
}