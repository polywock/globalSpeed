import { useStateView } from "../hooks/useStateView"
import { FxControl } from "./FxControl"
import produce from "immer"

type FxPanelProps = {}

export function FxPanel(props: FxPanelProps) {
  const [enabledView] = useStateView({enabled: true})
  const [view, setView] = useStateView({backdropFx: true, elementFx: true})

  if (!view || !enabledView) return <div className="panel unloaded"></div>

  return (
    <FxControl live={true} className="panel" elementFx={view.elementFx} backdropFx={view.backdropFx} enabled={enabledView.enabled} handleFxChange={(backdrop, fx) => {
      setView(produce(view, d => {
        d[backdrop ? "backdropFx" : "elementFx"] = fx
      }))
    }} swapFx={() => {
      setView(produce(view, d => {
        [d.backdropFx, d.elementFx] = [d.elementFx, d.backdropFx]
      }))
    }}/>
  )
}


