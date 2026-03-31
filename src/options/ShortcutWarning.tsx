import { HiOutlineInformationCircle } from "react-icons/hi"
import "./ShortcutWarning.css"

export function ShortcutWarning(props: {}) {
	return (
		<div className="ShortcutWarning">
			<HiOutlineInformationCircle />
			By default, shortcuts are disabled on most websites. <span className="link">Learn how to enable shortcuts on any website.</span>
		</div>
	)
}
