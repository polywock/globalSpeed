import { useEffect, useState } from "react"
import { RegularTooltip } from "@/comps/RegularTooltip"
import { Toggle } from "@/comps/Toggle"
import { gvar } from "@/globalVar"
import { IS_CHROME_BUILD } from "@/utils/buildFlags"
import { requestCreateTab } from "../utils/browserUtils"
import { OptionField } from "./OptionField"
import { OptionFieldLabel } from "./OptionFieldLabel"

export function LocalFilesField(props: {}) {
	const [access, setAccess] = useState({} as { file?: boolean; incognito?: boolean })

	useEffect(() => {
		if (!IS_CHROME_BUILD) return
		let alive = true

		const apply = (key: "file" | "incognito") => (v: boolean) => {
			alive && setAccess((prev) => ({ ...prev, [key]: v }))
		}

		chrome.extension?.isAllowedFileSchemeAccess?.()?.then(apply("file"), () => {})
		chrome.extension?.isAllowedIncognitoAccess?.()?.then(apply("incognito"), () => {})

		return () => {
			alive = false
		}
	}, [])

	const openPage = (text: string) => {
		requestCreateTab(`chrome://extensions/?id=${chrome.runtime.id}#:~:text=${encodeURIComponent(text)}`)
	}

	return (
		<>
			{/* Run on local files */}
			{access.file != null && (
				<OptionField>
					<OptionFieldLabel>
						<span>{gvar.gsm.options.flags.localFiles}</span>
						<RegularTooltip title={gvar.gsm.options.flags.localFilesTooltip} align="right" />
					</OptionFieldLabel>
					<Toggle aria-label={gvar.gsm.options.flags.localFiles} value={access.file} onChange={() => openPage("allow access to file urls")} />
				</OptionField>
			)}

			{/* Run in incognito */}
			{access.incognito != null && (
				<OptionField>
					<OptionFieldLabel>
						<span>{gvar.gsm.options.flags.incognito}</span>
						<RegularTooltip title={gvar.gsm.options.flags.incognitoTooltip} align="right" />
					</OptionFieldLabel>
					<Toggle aria-label={gvar.gsm.options.flags.incognito} value={access.incognito} onChange={() => openPage("allow in incognito")} />
				</OptionField>
			)}
		</>
	)
}
