import { useState, KeyboardEvent } from "react"
import { Hotkey, extractHotkey, formatHotkey } from "../utils/keys"
import "./KeyPicker.css"
import { Tooltip } from "./Tooltip"

type KeyPickerProps = {
	onChange: (key: Hotkey) => void
	value: Hotkey
	virtual: boolean
}

const MODIFIER_KEYS = ["Control", "Alt", "Shift", "Meta"]

export const KeyPicker = (props: KeyPickerProps) => {
	const [enterState, setEnterState] = useState(false)

	const handleOnKeyDown = (e: KeyboardEvent) => {
		if (!enterState && e.key === "Enter") {
			setEnterState(!enterState)
			return
		}

		if (!enterState) {
			return
		}

		// skip if modifier fear is target.
		if (MODIFIER_KEYS.includes(e.key)) {
			return
		}

		e.preventDefault()

		props.onChange && props.onChange(extractHotkey(e.nativeEvent, !props.virtual, props.virtual))
		setEnterState(false)
	}

	return (
		<Tooltip maxHmr={1} title={enterState ? gvar.gsm.options.editor.keyPickerInputTooltip : gvar.gsm.options.editor.keyPickerInput}>
			<div
				onBlur={() => setEnterState(false)}
				onKeyDown={handleOnKeyDown}
				onClick={(e) => setEnterState(!enterState)}
				tabIndex={0}
				onContextMenuCapture={(e) => {
					e.preventDefault()
					e.stopPropagation()
					enterState && setEnterState(false)
					props.onChange?.(null)
				}}
				className="KeyPicker"
			>
				{enterState ? "..." : formatHotkey(props.value)}
			</div>
		</Tooltip>
	)
}
