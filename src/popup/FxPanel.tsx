import { getDefaultFx } from "@/defaults"
import { produce } from "@/utils/helper"
import { useStateView } from "../hooks/useStateView"
import { FxControl } from "./FxControl"

type FxPanelProps = {}

export function FxPanel(props: FxPanelProps) {
	const [enabledView] = useStateView({ enabled: true })
	const [view, setView] = useStateView({ backdropFx: true, elementFx: true })

	if (!view || !enabledView) return <div className="min-h-[40px] p-[8px]" />

	return (
		<FxControl
			live={true}
			className="min-h-[40px] p-[8px]"
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
