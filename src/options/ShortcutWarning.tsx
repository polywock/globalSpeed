import { useState } from "react"
import { HiOutlineInformationCircle } from "react-icons/hi"
import { ModalBase } from "@/comps/ModalBase"
import "./ShortcutWarning.css"

export function ShortcutWarning(props: { isBlockMode: boolean }) {
	const [showModal, setShowModal] = useState(false)

	return (
		<div className="ShortcutWarning">
			<HiOutlineInformationCircle />
			{gvar.gsm.options.editor[props.isBlockMode ? "shortcutWarningBlock" : "shortcutWarningAllow"]}{" "}
			<span className="link" onClick={() => setShowModal(true)}>
				{gvar.gsm.options.editor["shortcutWarningLearn"]}
			</span>
			{showModal && (
				<ModalBase onClose={() => setShowModal(false)} passClass="ShortcutWarningModal">
					<img
						onClick={() => setShowModal(false)}
						src={`images/shortcut_${gvar.gsm._shortcut_screenshot ? gvar.gsm._lang.replace("-", "").toLowerCase() : "en"}.png`}
					/>
				</ModalBase>
			)}
		</div>
	)
}
