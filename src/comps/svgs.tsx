import * as React from "react"

type SvgPropsBase = {
	width?: React.SVGAttributes<SVGElement>["width"]
	height?: React.SVGAttributes<SVGElement>["height"]
	style?: React.SVGAttributes<SVGElement>["style"]
	className?: React.SVGAttributes<SVGElement>["className"]
	color?: React.SVGAttributes<SVGElement>["color"]
}

export type SvgProps = SvgPropsBase & {
	size?: number | string
}

function prepareProps(props: SvgProps) {
	props = { ...(props ?? {}) }
	props.width = props.width ?? props.size ?? "1em"
	props.height = props.height ?? props.size ?? "1em"

	delete props.size
	return props as SvgPropsBase
}

export function Zap(props: SvgProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			height="1em"
			fill="currentColor"
			stroke="currentColor"
			strokeWidth={0}
			viewBox="0 0 10 16"
			{...prepareProps(props)}
		>
			<path fillRule="evenodd" stroke="none" d="M10 7H6l3-7-9 9h4l-3 7 9-9z" />
		</svg>
	)
}

export function Pin(props: SvgProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			height="1em"
			fill="currentColor"
			stroke="currentColor"
			strokeWidth={0}
			viewBox="0 0 16 16"
			{...prepareProps(props)}
		>
			<path
				fillRule="evenodd"
				stroke="none"
				d="M10 1.2V2l.5 1L6 6H2.2c-.44 0-.67.53-.34.86L5 10l-4 5 5-4 3.14 3.14a.5.5 0 0 0 .86-.34V10l3-4.5 1 .5h.8c.44 0 .67-.53.34-.86L10.86.86a.5.5 0 0 0-.86.34z"
			/>
		</svg>
	)
}

export function Gear(props: SvgProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			height="1em"
			fill="currentColor"
			stroke="currentColor"
			strokeWidth={0}
			viewBox="0 0 14 16"
			{...prepareProps(props)}
		>
			<path
				fillRule="evenodd"
				stroke="none"
				d="M14 8.77v-1.6l-1.94-.64-.45-1.09.88-1.84-1.13-1.13-1.81.91-1.09-.45-.69-1.92h-1.6l-.63 1.94-1.11.45-1.84-.88-1.13 1.13.91 1.81-.45 1.09L0 7.23v1.59l1.94.64.45 1.09-.88 1.84 1.13 1.13 1.81-.91 1.09.45.69 1.92h1.59l.63-1.94 1.11-.45 1.84.88 1.13-1.13-.92-1.81.47-1.09L14 8.75v.02zM7 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"
			/>
		</svg>
	)
}
