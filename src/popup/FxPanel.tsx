import { getDefaultFx } from "@/defaults"
import { useStateView } from "../hooks/useStateView"
import { FxControl } from "./FxControl"
import { produce } from "immer"

type FxPanelProps = {}

export function FxPanel(props: FxPanelProps) {
	const [enabledView] = useStateView({ enabled: true })
	const [view, setView] = useStateView({ backdropFx: true, elementFx: true })

	if (!view || !enabledView) return <div className="panel unloaded"></div>

	return (
		<FxControl
			live={true}
			className="panel"
			_elementFx={view.elementFx}
			_backdropFx={view.backdropFx}
			enabled={enabledView.enabled}
			handleChange={(elementFx, backdropFx) => {
				setView(
					produce(view, (d) => {
						d["elementFx"] = elementFx
						d["backdropFx"] = backdropFx
					}),
				)
			}}
		/>
	)
}
