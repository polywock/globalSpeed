import { useState } from "react"
import { ModalBase } from "@/comps/ModalBase"
import { gvar } from "@/globalVar"

export function ShortcutWarning(props: { isBlockMode: boolean }) {
	const [showModal, setShowModal] = useState(false)

	return (
		<div className="-mt-2.5 mb-2.5 text-xl italic opacity-50">
			{gvar.gsm.options.editor[props.isBlockMode ? "shortcutWarningBlock" : "shortcutWarningAllow"]}{" "}
			<span
				className="cursor-pointer border-0 border-b-2 border-foreground/50 transition-opacity duration-150 hover:opacity-65"
				onClick={() => setShowModal(true)}
			>
				{gvar.gsm.options.editor.shortcutWarningLearn}
			</span>
			{showModal && (
				<ModalBase onClose={() => setShowModal(false)}>
					<img
						className="border-[5px] border-white"
						onClick={() => setShowModal(false)}
						src={`images/shortcut_${gvar.gsm._shortcut_screenshot ? gvar.gsm._lang.replace("-", "").toLowerCase() : "en"}.png`}
					/>
				</ModalBase>
			)}
		</div>
	)
}
