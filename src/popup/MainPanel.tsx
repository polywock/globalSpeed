import React from "react"
import { conformSpeed } from "../utils/configUtils"
import { SpeedControl } from "./SpeedControl"
import { MediaView } from "./MediaView"
import { useStateView } from "../hooks/useStateView"
import { useMediaWatch } from "../hooks/useMediaWatch"
import "./MainPanel.scss"
import produce from "immer"


export function MainPanel(props: {}) {
  const [view, setView] = useStateView({speed: true})
  const mediaInfos = useMediaWatch()
  if (!view) return <div className="panel"></div>

  return (
    <div className="MainPanal panel">
      <SpeedControl speed={view.speed} onChange={v => {
        setView(produce(view, d => {
          d.speed = conformSpeed(v)
        }))
      }}/>
      {mediaInfos.map(info => (
        <MediaView key={info.key} info={info}/>
      ))}
    </div>
  )
}