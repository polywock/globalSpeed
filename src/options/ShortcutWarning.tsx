import { useState } from "react"
import { HiOutlineInformationCircle } from "react-icons/hi"
import { ModalBase } from "@/comps/ModalBase"
import "./ShortcutWarning.css"

export function ShortcutWarning(props: {}) {
	const [showModal, setShowModal] = useState(false)

	return (
		<div className="ShortcutWarning">
			<HiOutlineInformationCircle />
			By default, shortcuts are disabled on most websites.{" "}
			<span className="link" onClick={() => setShowModal(true)}>
				Learn to enable shortcuts for a website
			</span>
			{showModal && (
				<ModalBase onClose={() => setShowModal(false)} passClass="ShortcutWarningModal">
					<img src="images/shortcut.png" />
				</ModalBase>
			)}
		</div>
	)
}
