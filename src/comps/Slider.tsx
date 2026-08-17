import debounce from "lodash.debounce"
import { useCallback, useEffect, useMemo, useState, type ComponentProps, type CSSProperties } from "react"
import { gvar } from "@/globalVar"
import { clamp, cn, inverseLerp, lerp } from "../utils/helper"

export function SliderInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
	return <input {...props} className={cn("slider grayscale-75", className)} type="range" />
}

type SliderProps = {
	min: number
	max: number
	step: number
	default: number
	value: number
	onChange: (newValue: number) => void
	maxWait?: number
	wait?: number
	className?: string
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
	} as CSSProperties

	return (
		<SliderInput
			className={cn(anchor && "origin-center scale-y-[1.5] outline-2 outline-[red]", props.className)}
			title={gvar.gsm.warnings.sliderTooltip}
			style={sliderStyle}
			onMouseDown={(e) => {
				e.shiftKey && ensureAnchored()
			}}
			onKeyDown={(e) => {
				e.shiftKey && ensureAnchored()
			}}
			onBlur={clearAnchor}
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
