import { useState, useEffect, ChangeEvent } from "react"
import { FloatTooltip } from "./FloatTooltip"
import { round } from "../utils/helper"

const NUMERIC_REGEX = /^-?(?=[\d\.])\d*(\.\d+)?$/

type NumericInputProps = {
	value: number
	onChange: (newValue: number) => any
	onFocus?: (e: React.FocusEvent<HTMLDivElement>) => void
	placeholder?: string
	noNull?: boolean
	min?: number
	max?: number
	rounding?: number
	disabled?: boolean
	className?: string
}

export const NumericInput = (props: NumericInputProps) => {
	const [ghostValue, setGhostValue] = useState("")
	const [problem, setProblem] = useState(null as string)

	useEffect(() => {
		setProblem(null)
		if (props.value == null) {
			ghostValue !== "" && setGhostValue("")
		} else {
			let parsedGhostValue = parseFloat(ghostValue)
			if (parsedGhostValue !== props.value) {
				setGhostValue(`${round(props.value, props.rounding ?? 4)}`)
			}
		}
	}, [props.value])

	const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
		setGhostValue(e.target.value)
		const value = e.target.value.trim()

		const parsed = round(parseFloat(value), props.rounding ?? 4)

		if (!props.noNull && !value.length) {
			setProblem(null)
			if (props.value != null) {
				props.onChange(null)
			}
		}

		if (!isNaN(parsed) && NUMERIC_REGEX.test(value)) {
			let min = props.min
			let max = props.max

			if (min != null && parsed < min) {
				setProblem(`>= ${min}`)
				return
			}
			if (max != null && parsed > max) {
				setProblem(`<= ${max}`)
				return
			}

			if (parsed !== round(props.value, props.rounding ?? 4)) {
				props.onChange(parsed)
			}
			setProblem(null)
		} else {
			setProblem(`NaN`)
		}
	}

	return (
		<div className={`NumericInput ${props.className || ""}`} style={{ position: "relative" }}>
			<input
				disabled={props.disabled ?? false}
				onBlur={(e) => {
					setProblem(null)
					setGhostValue(props.value == null ? "" : `${round(props.value, props.rounding ?? 4)}`)
				}}
				className={problem ? "error" : ""}
				placeholder={props.placeholder}
				type="text"
				onChange={handleOnChange}
				value={ghostValue}
				onFocus={props.onFocus}
			/>
			{problem && <FloatTooltip value={problem} />}
		</div>
	)
}
