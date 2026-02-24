import { useMemo, useCallback, useEffect, useState, type CSSProperties } from "react"
import { clamp, inverseLerp, lerp } from "../utils/helper"
import debounce from "lodash.debounce"
import "./Slider.css"

type SliderProps = {
	min: number
	max: number
	step: number
	default: number
	value: number
	onChange: (newValue: number) => void
	maxWait?: number
	wait?: number
}

export function Slider(props: SliderProps) {
	const [anchor, setAnchor] = useState(null as [number])
	const env = useMemo(() => ({ props }) as { props: SliderProps; handleChange?: (v: number) => void }, [])
	env.props = props

	env.handleChange = useCallback(
		debounce(
			(value: number) => {
				const { props } = env
				props.onChange(clamp(props.min, props.max, value))
			},
			props.wait ?? 25,
			{ maxWait: props.maxWait ?? 50, leading: true, trailing: true },
		),
		[],
	)

	useEffect(() => {
		return () => {
			;(env.handleChange as any)?.flush()
		}
	}, [])

	let min = props.min
	let max = props.max
	let step = props.step ?? 0.01
	if (anchor) {
		const normal = inverseLerp(props.min, props.max, anchor[0])
		min = clamp(props.min, props.max, lerp(props.min, props.max, normal - 1 / 20))
		max = clamp(props.min, props.max, lerp(props.min, props.max, normal + 1 / 20))
		step *= 0.1
	}

	const ensureAnchored = () => {
		setAnchor([props.value])
	}

	const clearAnchor = () => {
		setAnchor(null)
	}

	const progressNormal = max === min ? 0 : clamp(0, 1, inverseLerp(min, max, props.value))
	const sliderStyle = {
		"--slider-progress": `${progressNormal * 100}%`,
		...(anchor ? { outline: "2px solid red", transformOrigin: "center", transform: "scaleY(1.5)" } : {}),
	} as CSSProperties

	return (
		<input
			title={gvar.gsm.warnings.sliderTooltip}
			style={sliderStyle}
			onMouseDown={(e) => {
				e.shiftKey && ensureAnchored()
			}}
			onKeyDown={(e) => {
				e.shiftKey && ensureAnchored()
			}}
			onBlur={clearAnchor}
			type="range"
			min={min}
			max={max}
			step={step}
			value={props.value}
			onChange={(e) => {
				env.handleChange(e.target.valueAsNumber)
			}}
		/>
	)
}
