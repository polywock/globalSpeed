import { Select } from "@/comps/Select"
import { gvar } from "@/globalVar"

type OriginProps = {
	x: string
	y: string
	onChange: (x: string, y: string) => void
}

/** Which point a transform scales and rotates around. */
export function Origin(props: OriginProps) {
	return (
		// One row until the label and dropdown stop fitting, then the dropdown drops below it.
		<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.25">
			<span className="whitespace-nowrap">{gvar.gsm.token.anchor}</span>
			<Select
				className="min-w-36 flex-1 truncate"
				aria-label={gvar.gsm.token.anchor}
				value={`${props.y}:${props.x}`}
				onChanged={(newValue) => {
					const [y, x] = newValue.split(":")
					props.onChange(x, y)
				}}
				options={[
					{ key: "top:left", value: gvar.gsm.token.topLeft },
					{ key: "top:center", value: gvar.gsm.token.topCenter },
					{ key: "top:right", value: gvar.gsm.token.topRight },
					{ key: "center:left", value: gvar.gsm.token.centerLeft },
					{ key: "center:center", value: gvar.gsm.token.center },
					{ key: "center:right", value: gvar.gsm.token.centerRight },
					{ key: "bottom:left", value: gvar.gsm.token.bottomLeft },
					{ key: "bottom:center", value: gvar.gsm.token.bottomCenter },
					{ key: "bottom:right", value: gvar.gsm.token.bottomRight },
				]}
			/>
		</div>
	)
}
