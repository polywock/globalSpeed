import { produce } from "immer"
import { SvgFilter } from "@/types"
import { FaPowerOff } from "react-icons/fa"
import { GoArrowDown, GoArrowUp, GoX } from "react-icons/go"
import { moveItem } from "@/utils/helper"
import { SliderPlus } from "@/comps/SliderPlus"
import { SVG_COLOR_MATRIX_PRESETS, SVG_MOSAIC_PRESETS, SVG_RGB_PRESETS, SVG_SPECIAL_PRESETS, svgFilterInfos } from "@/defaults/filters"
import { Tooltip } from "@/comps/Tooltip"
import { SVG_FILTER_ADDITIONAL } from "@/defaults/svgFilterAdditional"
import { useState } from "react"
import "./SvgFilterItem.css"

const MOSAIC_DEFAULT = svgFilterInfos["mosaic"].generate()
const NOISE_DEFAULT = svgFilterInfos["noise"].generate()
const MOTION_DEFAULT = svgFilterInfos["motion"].generate()

export function SvgFilterItem(props: {
	filter: SvgFilter
	onChange: (newValue: SvgFilter) => void
	list: SvgFilter[]
	listOnChange: (newValue: SvgFilter[]) => void
}) {
	const { filter, list, onChange, listOnChange } = props
	const presetInfo = SVG_TYPE_TO_PRESET[filter.type]
	const [currentPreset, setCurrentPreset] = useState("")

	return (
		<div className="SvgFilter">
			<div className="header">
				<div className={filter.enabled ? "active" : "muted"}>
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
					<button
						className="icon"
						onClick={() => {
							listOnChange(
								produce(list, (d) => {
									moveItem(d, (v) => v.id === filter.id, "U")
								}),
							)
						}}
					>
						<GoArrowUp size="1.42rem" />
					</button>
				</Tooltip>
				<Tooltip title={gvar.gsm.token.moveUp}>
					<button
						className="icon"
						onClick={() => {
							listOnChange(
								produce(list, (d) => {
									moveItem(d, (v) => v.id === filter.id, "D")
								}),
							)
						}}
					>
						<GoArrowDown size="1.42rem" />
					</button>
				</Tooltip>
				<Tooltip title={gvar.gsm.token.delete}>
					<button className="icon">
						<GoX
							size="1.6rem"
							onClick={() => {
								listOnChange(
									produce(list, (list) => {
										const idx = list.findIndex((v) => v.id === filter.id)
										if (idx >= 0) list.splice(idx, 1)
									}),
								)
							}}
						/>
					</button>
				</Tooltip>
			</div>
			{presetInfo && (
				<div className="presets">
					<div>{gvar.gsm.filter.otherFilters.presets}</div>
					<select
						value={currentPreset}
						onChange={(e) => {
							setCurrentPreset(e.target.value || null)
							const preset = presetInfo.options.find((o) => o.id === e.target.value)
							preset && presetInfo.handler(filter, onChange, preset)
						}}
					>
						<option value={""}>{"---"}</option>
						{presetInfo.options.map((opt) => (
							<option key={opt.id} value={opt.id}>
								{opt.id}
							</option>
						))}
					</select>
				</div>
			)}
			<div className="core">
				{filter.type === "custom" && (
					<textarea
						rows={5}
						style={{ width: "100%" }}
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
							label={gvar.gsm.filter.otherFilters.levels}
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

						<div style={{ marginTop: "10px" }}>
							<span style={{ marginRight: "10px" }}>{gvar.gsm.token.mode}</span>
							<select
								value={filter.noise.mode}
								onChange={(e) => {
									onChange(
										produce(filter, (v) => {
											v.noise.mode = e.target.value
										}),
									)
								}}
							>
								<option value="hard-light">{gvar.gsm.filter.otherFilters.hardLight}</option>
								<option value="multiply">{gvar.gsm.filter.otherFilters.multiply}</option>
								<option value="color-burn">{gvar.gsm.filter.otherFilters.colorBurn}</option>
							</select>
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
			<button onClick={props.onClick} style={{ padding: "0px 5px", marginLeft: "10px" }} className={`toggle ${props.active ? "active" : ""}`}>
				:
			</button>
		</Tooltip>
	)
}

const SVG_TYPE_TO_PRESET: {
	[key in keyof Partial<typeof SVG_FILTER_ADDITIONAL>]: {
		options: { id: string; values: any }[]
		handler: (filter: SvgFilter, onChange: (filter: SvgFilter) => void, preset: { id: string; values: any }) => void
	}
} = {
	mosaic: {
		options: SVG_MOSAIC_PRESETS,
		handler: (filter, onChange, preset) => {
			onChange({ ...filter, mosaic: { ...filter.mosaic, ...preset.values } })
		},
	},
	colorMatrix: {
		options: SVG_COLOR_MATRIX_PRESETS,
		handler: (filter, onChange, preset) => {
			onChange({ ...filter, colorMatrix: preset.values })
		},
	},
	rgb: {
		options: SVG_RGB_PRESETS,
		handler: (filter, onChange, preset) => {
			onChange({ ...filter, rgb: preset.values })
		},
	},
	special: {
		options: SVG_SPECIAL_PRESETS,
		handler: (filter, onChange, preset) => {
			onChange({ ...filter, text: preset.values })
		},
	},
}
