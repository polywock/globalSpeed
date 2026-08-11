import { useEffect, useRef, useState } from "react"
import { gvar } from "@/globalVar"
import { Keybind } from "../types"
import { requestCreateTab } from "../utils/browserUtils"
import { WarningBanner } from "./WarningBanner"

type Props = {
	keybinds: Keybind[]
}

export function CommandWarning(props: Props) {
	const [show, setShow] = useState(false)

	const env = useRef({} as { keybinds?: Keybind[]; show?: boolean }).current
	env.show = show
	env.keybinds = props.keybinds

	useEffect(() => {
		const handleInterval = () => {
			chrome.commands.getAll((cc) => {
				const target = cc.some(
					(c) => c.name.startsWith("command") && c.shortcut && !env.keybinds.some((kb) => kb.enabled && (kb.globalKey || "commandA") === c.name),
				)
				target !== env.show && setShow(target)
			})
		}

		const intervalId = setInterval(handleInterval, 1000)

		return () => {
			clearInterval(intervalId)
		}
	}, [])

	if (!show) return null

	return (
		<WarningBanner
			action={{
				label: gvar.gsm.token.openPage,
				onClick: () => requestCreateTab(`chrome://extensions/shortcuts#:~:text=${encodeURIComponent("Global Speed")}`),
			}}
		>
			{gvar.gsm.warnings.unusedGlobal}
		</WarningBanner>
	)
}
