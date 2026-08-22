import { ChangeEvent, RefObject, useEffect, useState } from "react"
import { gvar } from "@/globalVar"
import { cn, round } from "../utils/helper"
import { FloatTooltip } from "./FloatTooltip"

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
	displayFixed?: number
	disabled?: boolean
	className?: string
	inputClassName?: string
	ref?: RefObject<any>
}

export const NumericInput = (props: NumericInputProps) => {
	const [ghostValue, setGhostValue] = useState("")
	const [problem, setProblem] = useState(null as string)

	const formatValue = (value: number) => {
		if (value == null) return ""
		const rounded = round(value, props.rounding ?? 4)
		if (props.displayFixed == null) return `${rounded}`
		const decimals = (`${rounded}`.split(".")[1] ?? "").length
		return rounded.toFixed(Math.max(decimals, props.displayFixed))
	}

	useEffect(() => {
		setProblem(null)
		if (props.value == null) {
			ghostValue !== "" && setGhostValue("")
		} else {
			let parsedGhostValue = parseFloat(ghostValue)
			if (parsedGhostValue !== props.value) {
				setGhostValue(formatValue(props.value))
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
			setProblem(gvar.gsm.token.invalidNumber)
		}
	}

	return (
		<div ref={props.ref} className={cn("relative", props.className)}>
			<input
				disabled={props.disabled ?? false}
				onBlur={(e) => {
					setProblem(null)
					setGhostValue(formatValue(props.value))
				}}
				className={cn("text-center", props.inputClassName, problem && "error")}
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
