import { useEffect, useRef, useState } from "react"
import { gvar } from "@/globalVar"
import { canPotentiallyUserScriptExecute, canUserScript, requestCreateTab } from "../utils/browserUtils"
import { WarningBanner } from "./WarningBanner"

export enum DevWarningType {
	NONE = 0,
	ENABLE_USERSCRIPTS = 1,
	NO_SUPPORT = 2,
}

export function useDevWarningType(hasJs: boolean): DevWarningType {
	const [type, setType] = useState(DevWarningType.NONE)
	const env = useRef({} as { type: DevWarningType }).current
	env.type = type

	useEffect(() => {
		if (!hasJs) {
			setType(DevWarningType.NONE)
			return
		}

		const handleInterval = () => {
			let target = DevWarningType.NO_SUPPORT
			if (canPotentiallyUserScriptExecute()) {
				target = canUserScript() ? DevWarningType.NONE : DevWarningType.ENABLE_USERSCRIPTS
			}

			target !== env.type && setType(target)
			env.type = target
		}

		handleInterval()
		const intervalId = setInterval(handleInterval, 300)

		return () => {
			clearInterval(intervalId)
		}
	}, [hasJs])

	return type
}

type Props = {
	forUrlRules?: boolean
} & (
	| {
			warningType: DevWarningType
			hasJs?: never
	  }
	| {
			hasJs?: boolean
			warningType?: never
	  }
)

export function DevWarning(props: Props) {
	const ownType = useDevWarningType(props.hasJs ?? false)
	const show = props.warningType ?? ownType

	if (!show) return null

	return (
		<WarningBanner
			action={
				show === DevWarningType.ENABLE_USERSCRIPTS
					? {
							label: gvar.gsm.token.openPage,
							onClick: () =>
								requestCreateTab(`chrome://extensions/?id=${chrome.runtime.id}#:~:text=${encodeURIComponent("Allow User Scripts")}`),
						}
					: undefined
			}
		>
			{show === DevWarningType.ENABLE_USERSCRIPTS
				? gvar.gsm.warnings[props.forUrlRules ? "jsWarningRules" : "jsWarning"]
				: gvar.gsm.warnings.jsUpdate}
		</WarningBanner>
	)
}
