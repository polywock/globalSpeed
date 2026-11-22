import { FaPowerOff } from "react-icons/fa"
import { GoArrowDown, GoArrowUp, GoX } from "react-icons/go"
import { LuLink2, LuLink2Off } from "react-icons/lu"
import { Select } from "@/comps/Select"
import { SliderPlus } from "@/comps/SliderPlus"
import { Tooltip } from "@/comps/Tooltip"
import { Button } from "@/comps/ui/button"
import { SVG_COLOR_MATRIX_PRESETS, SVG_MOSAIC_PRESETS, SVG_RGB_PRESETS, SVG_SPECIAL_PRESETS, svgFilterInfos } from "@/defaults/filters"
import { SVG_FILTER_ADDITIONAL } from "@/defaults/svgFilterAdditional"
import { gvar } from "@/globalVar"
import { SvgFilter } from "@/types"
import { cn, deepEqual, moveItem, produce } from "@/utils/helper"

const MOSAIC_DEFAULT = svgFilterInfos["mosaic"].generate()
const NOISE_DEFAULT = svgFilterInfos["noise"].generate()
const MOTION_DEFAULT = svgFilterInfos["motion"].generate()
const DISTORTION_DEFAULT = svgFilterInfos["distortion"].generate()
const GLOW_DEFAULT = svgFilterInfos["glow"].generate()
const CHROMATIC_DEFAULT = svgFilterInfos["chromatic"].generate()
const SCANLINES_DEFAULT = svgFilterInfos["scanlines"].generate()

export function SvgFilterItem(props: {
	filter: SvgFilter
	onChange: (newValue: SvgFilter) => void
	list: SvgFilter[]
	listOnChange: (newValue: SvgFilter[]) => void
}) {
	const { filter, list, onChange, listOnChange } = props
	const presetInfo = SVG_TYPE_TO_PRESET[filter.type]
	// Derived from the stored filter so it survives reopening and clears once values are edited by hand.
	const currentPreset = presetInfo?.options.find((preset) => presetInfo.matches(filter, preset))?.id ?? ""

	return (
		<div className="mt-3.75 rounded-lg border border-border p-2.5">
			<div className="mb-1.25 grid grid-cols-[max-content_1fr_max-content_max-content_max-content] items-center gap-x-1.25 text-xl">
				<div className={cn("hover:opacity-90", filter.enabled ? "text-primary" : "text-muted-foreground")}>
					<Tooltip title={filter.enabled ? gvar.gsm.token.off : gvar.gsm.token.on}>
						<FaPowerOff
							size="1.21rem"
							onClick={() => {
								onChange(
									produce(filter, (v) => {
										v.enabled = !v.enabled
									}),
								)
							}}
						/>
					</Tooltip>
				</div>
				{(gvar.gsm.filter.otherFilters as any)[filter.type]}
				<Tooltip title={gvar.gsm.token.moveUp}>
					<Button
						variant="icon"
						size="icon-auto"
						onClick={() => {
							listOnChange(
								produce(list, (d) => {
									moveItem(d, (v) => v.id === filter.id, "U")
								}),
							)
						}}
					>
						<GoArrowUp size="1.42rem" />
					</Button>
				</Tooltip>
				<Tooltip title={gvar.gsm.token.moveDown}>
					<Button
						variant="icon"
						size="icon-auto"
						onClick={() => {
							listOnChange(
								produce(list, (d) => {
									moveItem(d, (v) => v.id === filter.id, "D")
								}),
							)
						}}
					>
						<GoArrowDown size="1.42rem" />
					</Button>
				</Tooltip>
				<Tooltip title={gvar.gsm.token.delete}>
					<Button
						variant="icon"
						size="icon-auto"
						onClick={() => {
							listOnChange(
								produce(list, (list) => {
									const idx = list.findIndex((v) => v.id === filter.id)
									if (idx >= 0) list.splice(idx, 1)
								}),
							)
						}}
					>
						<GoX size="1.6rem" />
					</Button>
				</Tooltip>
			</div>
			{presetInfo && (
				<div className="mt-1.75 grid grid-cols-[max-content_1fr] items-center gap-x-1.25">
					<div>{gvar.gsm.filter.otherFilters.presets}</div>
					<Select
						aria-label={gvar.gsm.filter.otherFilters.presets}
						value={currentPreset}
						onChanged={(newValue) => {
							const preset = presetInfo.options.find((o) => o.id === newValue)
							preset && presetInfo.handler(filter, onChange, preset)
						}}
						options={[{ key: "", value: "---" }, ...presetInfo.options.map((opt) => ({ key: opt.id, value: opt.id }))]}
					/>
				</div>
			)}
			<div className="mt-1.75">
				{filter.type === "custom" && (
					<textarea
						rows={5}
						className="w-full"
						onChange={(e) => {
							onChange(
								produce(filter, (v) => {
									v.text = e.target.value
								}),
							)
						}}
					>
						{filter.text}
					</textarea>
				)}

				{/* Mosaic  */}
				{filter.type === "mosaic" && (
					<>
						{[
							{
								sMin: 1,
								sMax: 100,
								sStep: 1,
								min: 1,
								max: 1000,
								default: MOSAIC_DEFAULT.mosaic.blockX,
								label: gvar.gsm.filter.otherFilters.blockX,
								key: "blockX",
								aspectKey: "blockAspect",
								otherCoord: "blockY",
							},
							{
								sMin: 1,
								sMax: 100,
								sStep: 1,
								min: 1,
								max: 1000,
								default: MOSAIC_DEFAULT.mosaic.blockY,
								label: gvar.gsm.filter.otherFilters.blockY,
								key: "blockY",
								aspectKey: "blockAspect",
								otherCoord: "blockX",
								br: true,
							},

							{
								sMin: 0,
								sMax: 1,
								sStep: 0.01,
								min: 0,
								max: 1,
								default: MOSAIC_DEFAULT.mosaic.sampleNormalX,
								label: gvar.gsm.filter.otherFilters.detailX,
								key: "sampleNormalX",
								aspectKey: "sampleAspect",
								otherCoord: "sampleNormalY",
							},
							{
								sMin: 0,
								sMax: 1,
								sStep: 0.01,
								min: 0,
								max: 1,
								default: MOSAIC_DEFAULT.mosaic.sampleNormalY,
								label: gvar.gsm.filter.otherFilters.detailY,
								key: "sampleNormalY",
								aspectKey: "sampleAspect",
								otherCoord: "sampleNormalX",
								br: true,
							},

							{
								sMin: 0,
								sMax: 10,
								sStep: 0.1,
								min: 0,
								max: 100,
								default: MOSAIC_DEFAULT.mosaic.scalingNormalX,
								label: gvar.gsm.filter.otherFilters.stretchX,
								key: "scalingNormalX",
								aspectKey: "scalingAspect",
								otherCoord: "scalingNormalY",
							},
							{
								sMin: 0,
								sMax: 10,
								sStep: 0.1,
								min: 0,
								max: 100,
								default: MOSAIC_DEFAULT.mosaic.scalingNormalY,
								label: gvar.gsm.filter.otherFilters.stretchY,
								key: "scalingNormalY",
								aspectKey: "scalingAspect",
								otherCoord: "scalingNormalX",
								br: true,
							},
						].map((info) => (
							<>
								<SliderPlus
									label={
										<>
											{info.label}
											<AspectLockButton
												active={!!(filter.mosaic as any)[info.aspectKey]}
												onClick={() => {
													onChange(
														produce(filter, (v) => {
															;(v.mosaic as any)[info.aspectKey] = !(v.mosaic as any)[info.aspectKey]
														}),
													)
												}}
											/>
										</>
									}
									value={(filter.mosaic as any)[info.key]}
									sliderMin={info.sMin}
									sliderMax={info.sMax}
									sliderStep={info.sStep}
									min={info.min}
									max={info.max}
									default={info.default}
									onChange={(newValue) => {
										onChange(
											produce(filter, (v) => {
												;(v.mosaic as any)[info.key] = newValue
												if ((v.mosaic as any)[info.aspectKey]) (v.mosaic as any)[info.otherCoord] = newValue
											}),
										)
									}}
								/>
								{!!info.br && <br />}
							</>
						))}
					</>
				)}

				{/* Blur */}
				{filter.type === "blur" && (
					<>
						<SliderPlus
							label={
								<>
									{gvar.gsm.filter.otherFilters.horizontal}
									<AspectLockButton
										active={filter.blur.aspectLock}
										onClick={() => {
											onChange(
												produce(filter, (v) => {
													v.blur.aspectLock = !v.blur.aspectLock
												}),
											)
										}}
									/>
								</>
							}
							value={filter.blur.x}
							sliderMin={0}
							sliderMax={50}
							sliderStep={1}
							min={0}
							max={500}
							default={0}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.blur.x = newValue
										if (v.blur.aspectLock) v.blur.y = newValue
									}),
								)
							}}
						/>
						<SliderPlus
							label={
								<>
									{gvar.gsm.filter.otherFilters.vertical}
									<AspectLockButton
										active={filter.blur.aspectLock}
										onClick={() => {
											onChange(
												produce(filter, (v) => {
													v.blur.aspectLock = !v.blur.aspectLock
												}),
											)
										}}
									/>
								</>
							}
							value={filter.blur.y}
							sliderMin={0}
							sliderMax={50}
							sliderStep={1}
							min={0}
							max={500}
							default={0}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.blur.y = newValue
										if (v.blur.aspectLock) v.blur.x = newValue
									}),
								)
							}}
						/>
					</>
				)}

				{/* Posterize  */}
				{filter.type === "posterize" && (
					<>
						<SliderPlus
							label={gvar.gsm.filter.otherFilters.posterizeLevels}
							value={filter.posterize}
							sliderMin={2}
							sliderMax={20}
							sliderStep={1}
							min={2}
							max={200}
							default={4}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.posterize = newValue
									}),
								)
							}}
						/>
					</>
				)}

				{/* Sharpen  */}
				{filter.type === "sharpen" && (
					<>
						<SliderPlus
							label={gvar.gsm.filter.otherFilters.amount}
							value={filter.sharpen}
							sliderMin={0}
							sliderMax={3}
							sliderStep={0.01}
							min={0}
							max={100}
							default={0}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.sharpen = newValue
									}),
								)
							}}
						/>
					</>
				)}

				{/* RGB  */}
				{filter.type === "rgb" && (
					<>
						{["red", "green", "blue"].map((v, i) => (
							<SliderPlus
								key={v}
								label={gvar.gsm.filter.otherFilters[v as keyof typeof gvar.gsm.filter.otherFilters]}
								value={filter.rgb[i]}
								sliderMin={0}
								sliderMax={3}
								sliderStep={0.01}
								min={0}
								max={100}
								default={1}
								onChange={(newValue) => {
									onChange(
										produce(filter, (v) => {
											v.rgb[i] = newValue
										}),
									)
								}}
							/>
						))}
					</>
				)}

				{/* Motion */}
				{filter.type === "motion" && (
					<>
						<SliderPlus
							label={
								<>
									{gvar.gsm.filter.otherFilters.horizontal}
									<AspectLockButton
										active={filter.motion.aspectLock}
										onClick={() => {
											onChange(
												produce(filter, (v) => {
													v.motion.aspectLock = !v.motion.aspectLock
												}),
											)
										}}
									/>
								</>
							}
							value={filter.motion.x}
							sliderMin={0}
							sliderMax={100}
							sliderStep={1}
							min={0}
							max={5000}
							default={MOTION_DEFAULT.motion.x}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.motion.x = newValue
										if (v.motion.aspectLock) v.motion.y = newValue
									}),
								)
							}}
						/>
						<SliderPlus
							label={
								<>
									{gvar.gsm.filter.otherFilters.vertical}
									<AspectLockButton
										active={filter.motion.aspectLock}
										onClick={() => {
											onChange(
												produce(filter, (v) => {
													v.motion.aspectLock = !v.motion.aspectLock
												}),
											)
										}}
									/>
								</>
							}
							value={filter.motion.y}
							sliderMin={0}
							sliderMax={100}
							sliderStep={1}
							min={0}
							max={5000}
							default={MOTION_DEFAULT.motion.y}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.motion.y = newValue
										if (v.motion.aspectLock) v.motion.x = newValue
									}),
								)
							}}
						/>
						<SliderPlus
							label={gvar.gsm.command.speed}
							value={filter.motion.speed}
							sliderMin={0}
							sliderMax={5}
							sliderStep={0.1}
							min={0}
							max={100}
							default={MOTION_DEFAULT.motion.speed}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.motion.speed = newValue
									}),
								)
							}}
						/>
					</>
				)}

				{/* Distortion */}
				{filter.type === "distortion" && (
					<>
						<SliderPlus
							label={gvar.gsm.filter.otherFilters.amount}
							value={filter.distortion.amount}
							sliderMin={0}
							sliderMax={100}
							sliderStep={1}
							min={-1000}
							max={1000}
							default={DISTORTION_DEFAULT.distortion.amount}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.distortion.amount = newValue
									}),
								)
							}}
						/>
						<SliderPlus
							label={gvar.gsm.token.size}
							value={filter.distortion.size}
							sliderMin={0}
							sliderMax={0.99}
							sliderStep={0.01}
							min={0}
							max={0.99}
							default={DISTORTION_DEFAULT.distortion.size}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.distortion.size = newValue
									}),
								)
							}}
						/>
						<SliderPlus
							label={gvar.gsm.command.speed}
							value={filter.distortion.speed}
							sliderMin={0}
							sliderMax={5}
							sliderStep={0.1}
							min={0}
							max={100}
							default={DISTORTION_DEFAULT.distortion.speed}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.distortion.speed = newValue
									}),
								)
							}}
						/>
					</>
				)}

				{/* Levels */}
				{filter.type === "levels" && (
					<>
						<SliderPlus
							label={gvar.gsm.filter.otherFilters.blackPoint}
							value={filter.levels.black}
							sliderMin={0}
							sliderMax={1}
							sliderStep={0.01}
							min={0}
							max={1}
							default={0}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.levels.black = newValue
									}),
								)
							}}
						/>
						<SliderPlus
							label={gvar.gsm.filter.otherFilters.whitePoint}
							value={filter.levels.white}
							sliderMin={0}
							sliderMax={1}
							sliderStep={0.01}
							min={0}
							max={1}
							default={1}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.levels.white = newValue
									}),
								)
							}}
						/>
						<SliderPlus
							label={gvar.gsm.filter.otherFilters.gamma}
							value={filter.levels.gamma}
							sliderMin={0.1}
							sliderMax={3}
							sliderStep={0.05}
							min={0.01}
							max={10}
							default={1}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.levels.gamma = newValue
									}),
								)
							}}
						/>
					</>
				)}

				{/* Glow */}
				{filter.type === "glow" && (
					<>
						<SliderPlus
							label={gvar.gsm.filter.otherFilters.threshold}
							value={filter.glow.threshold}
							sliderMin={0}
							sliderMax={0.99}
							sliderStep={0.01}
							min={0}
							max={0.99}
							default={GLOW_DEFAULT.glow.threshold}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.glow.threshold = newValue
									}),
								)
							}}
						/>
						<SliderPlus
							label={gvar.gsm.filter.otherFilters.radius}
							value={filter.glow.radius}
							sliderMin={0}
							sliderMax={20}
							sliderStep={0.5}
							min={0}
							max={200}
							default={GLOW_DEFAULT.glow.radius}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.glow.radius = newValue
									}),
								)
							}}
						/>
						<SliderPlus
							label={gvar.gsm.filter.otherFilters.amount}
							value={filter.glow.amount}
							sliderMin={0}
							sliderMax={3}
							sliderStep={0.05}
							min={0}
							max={100}
							default={GLOW_DEFAULT.glow.amount}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.glow.amount = newValue
									}),
								)
							}}
						/>
					</>
				)}

				{/* Chromatic aberration */}
				{filter.type === "chromatic" && (
					<>
						<SliderPlus
							label={gvar.gsm.filter.otherFilters.amount}
							value={filter.chromatic.amount}
							sliderMin={0}
							sliderMax={20}
							sliderStep={0.5}
							min={-200}
							max={200}
							default={CHROMATIC_DEFAULT.chromatic.amount}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.chromatic.amount = newValue
									}),
								)
							}}
						/>
						<SliderPlus
							label={gvar.gsm.filter.otherFilters.angle}
							value={filter.chromatic.angle}
							sliderMin={0}
							sliderMax={360}
							sliderStep={1}
							min={-360}
							max={360}
							default={CHROMATIC_DEFAULT.chromatic.angle}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.chromatic.angle = newValue
									}),
								)
							}}
						/>
					</>
				)}

				{/* Scanlines */}
				{filter.type === "scanlines" && (
					<>
						<SliderPlus
							label={gvar.gsm.filter.otherFilters.spacing}
							value={filter.scanlines.spacing}
							sliderMin={2}
							sliderMax={40}
							sliderStep={1}
							min={2}
							max={500}
							default={SCANLINES_DEFAULT.scanlines.spacing}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.scanlines.spacing = newValue
									}),
								)
							}}
						/>
						<SliderPlus
							label={gvar.gsm.filter.otherFilters.amount}
							value={filter.scanlines.amount}
							sliderMin={0}
							sliderMax={1}
							sliderStep={0.01}
							min={0}
							max={1}
							default={SCANLINES_DEFAULT.scanlines.amount}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.scanlines.amount = newValue
									}),
								)
							}}
						/>
					</>
				)}

				{/* Noise */}
				{filter.type === "noise" && (
					<>
						<SliderPlus
							label={gvar.gsm.token.size}
							value={filter.noise.size}
							sliderMin={0}
							sliderMax={0.85}
							sliderStep={0.01}
							min={0}
							max={0.99}
							default={NOISE_DEFAULT.noise.size}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.noise.size = newValue
									}),
								)
							}}
						/>
						<SliderPlus
							label={gvar.gsm.command.speed}
							value={filter.noise.speed}
							sliderMin={0}
							sliderMax={5}
							sliderStep={0.1}
							min={0}
							max={100}
							default={NOISE_DEFAULT.noise.speed}
							onChange={(newValue) => {
								onChange(
									produce(filter, (v) => {
										v.noise.speed = newValue
									}),
								)
							}}
						/>

						<div className="mt-2.5">
							<span className="mr-2.5">{gvar.gsm.token.mode}</span>
							<Select
								aria-label={gvar.gsm.token.mode}
								value={filter.noise.mode}
								onChanged={(newValue) => {
									onChange(
										produce(filter, (v) => {
											v.noise.mode = newValue
										}),
									)
								}}
								options={[
									{ key: "hard-light", value: gvar.gsm.filter.otherFilters.hardLight },
									{ key: "multiply", value: gvar.gsm.filter.otherFilters.multiply },
									{ key: "color-burn", value: gvar.gsm.filter.otherFilters.colorBurn },
								]}
							/>
						</div>
					</>
				)}
			</div>
		</div>
	)
}

function AspectLockButton(props: { active: boolean; onClick: () => void }) {
	return (
		<Tooltip title={gvar.gsm.token.aspectLock}>
			<Button
				size="control"
				variant="ghost"
				aria-pressed={props.active}
				aria-label={gvar.gsm.token.aspectLock}
				className="ml-2.5 px-0 py-0 align-middle text-secondary-foreground"
				onClick={props.onClick}
			>
				{props.active ? <LuLink2 className="size-5" /> : <LuLink2Off className="size-5" />}
			</Button>
		</Tooltip>
	)
}

const SVG_TYPE_TO_PRESET: {
	[key in keyof Partial<typeof SVG_FILTER_ADDITIONAL>]: {
		options: { id: string; values: any }[]
		matches: (filter: SvgFilter, preset: { id: string; values: any }) => boolean
		handler: (filter: SvgFilter, onChange: (filter: SvgFilter) => void, preset: { id: string; values: any }) => void
	}
} = {
	mosaic: {
		options: SVG_MOSAIC_PRESETS,
		matches: (filter, preset) => Object.entries(preset.values).every(([key, value]) => (filter.mosaic as any)?.[key] === value),
		handler: (filter, onChange, preset) => {
			onChange({ ...filter, mosaic: { ...filter.mosaic, ...preset.values } })
		},
	},
	colorMatrix: {
		options: SVG_COLOR_MATRIX_PRESETS,
		matches: (filter, preset) => deepEqual(filter.colorMatrix, preset.values),
		handler: (filter, onChange, preset) => {
			onChange({ ...filter, colorMatrix: preset.values })
		},
	},
	rgb: {
		options: SVG_RGB_PRESETS,
		matches: (filter, preset) => deepEqual(filter.rgb, preset.values),
		handler: (filter, onChange, preset) => {
			onChange({ ...filter, rgb: preset.values })
		},
	},
	special: {
		options: SVG_SPECIAL_PRESETS,
		matches: (filter, preset) => filter.text === preset.values,
		handler: (filter, onChange, preset) => {
			onChange({ ...filter, text: preset.values })
		},
	},
}
