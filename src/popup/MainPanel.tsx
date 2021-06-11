import { conformSpeed } from "../utils/configUtils"
import { SpeedControl } from "./SpeedControl"
import { MediaView } from "./MediaView"
import { useStateView } from "../hooks/useStateView"
import { useMediaWatch } from "../hooks/useMediaWatch"
import produce from "immer"
import "./MainPanel.scss"


export function MainPanel(props: {}) {
  const [view, setView] = useStateView({speed: true, hideMediaView: true})
  if (!view) return <div className="panel"></div>

  return (
    <div className="MainPanal panel">
      <SpeedControl speed={view.speed} onChange={v => {
        setView(produce(view, d => {
          d.speed = conformSpeed(v)
        }))
      }}/>
      {view.hideMediaView ? null : <MediaViews/>}
    </div>
  )
}



export function MediaViews(props: {}) {
  const watchInfo = useMediaWatch()

  return (
    <>
      {(watchInfo?.infos || []).map(info => (
        <MediaView key={info.key} info={info} pinned={info.key === watchInfo.pinned}/>
      ))}
    </>
  )
}