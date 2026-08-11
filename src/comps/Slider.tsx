import debounce from "lodash.debounce"
import { useCallback, useEffect, useMemo, useState, type ComponentProps, type CSSProperties } from "react"
import { gvar } from "@/globalVar"
import { clamp, cn, inverseLerp, lerp } from "../utils/helper"

const TRACK_CLASSES =
	"[&::-webkit-slider-runnable-track]:h-(--slider-track-height) [&::-webkit-slider-runnable-track]:w-full [&::-webkit-slider-runnable-track]:cursor-pointer [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:border-none [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--slider-fill-color)_0%,var(--slider-fill-color)_var(--slider-progress),var(--slider-track-color)_var(--slider-progress),var(--slider-track-color)_100%)] [&::-moz-range-track]:h-(--slider-track-height) [&::-moz-range-track]:w-full [&::-moz-range-track]:cursor-pointer [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-none [&::-moz-range-track]:bg-(--slider-track-color) [&::-moz-range-progress]:h-(--slider-track-height) [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:border-none [&::-moz-range-progress]:bg-(--slider-fill-color)"

const THUMB_CLASSES =
	"[&::-webkit-slider-thumb]:mt-[calc((var(--slider-track-height)-var(--slider-thumb-size))*0.5)] [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:size-(--slider-thumb-size) [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-[var(--slider-thumb-border)] [&::-webkit-slider-thumb]:bg-(--slider-thumb-color) [&::-webkit-slider-thumb]:shadow-[0_1px_2px_color-mix(in_oklab,black_40%,transparent)] [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-(--slider-thumb-size) [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-[var(--slider-thumb-border)] [&::-moz-range-thumb]:bg-(--slider-thumb-color) [&::-moz-range-thumb]:shadow-[0_1px_2px_color-mix(in_oklab,black_40%,transparent)]"

const FOCUS_CLASSES =
	"focus-visible:outline-none [&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_3px_var(--border),0_1px_2px_color-mix(in_oklab,black_40%,transparent)] [&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_3px_var(--border),0_1px_2px_color-mix(in_oklab,black_40%,transparent)]"

const SLIDER_CLASS = cn(
	"w-full cursor-pointer appearance-none bg-transparent [--slider-track-height:6px] [--slider-thumb-size:16px] [--slider-fill-color:var(--primary)] [--slider-track-color:var(--input)] [--slider-thumb-color:var(--slider-fill-color)] [--slider-thumb-border:transparent] [--slider-progress:0%]",
	TRACK_CLASSES,
	THUMB_CLASSES,
	FOCUS_CLASSES,
)

export function SliderInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
	return <input {...props} className={cn(SLIDER_CLASS, className)} type="range" />
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
