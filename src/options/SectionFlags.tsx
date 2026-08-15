import { ComponentPropsWithoutRef, useEffect, useMemo, useState } from "react"
import { GoX } from "react-icons/go"
import { TfiMoreAlt } from "react-icons/tfi"
import { GearIcon } from "@/comps/GearIcon"
import { Minmax } from "@/comps/Minmax"
import { NumericInput } from "@/comps/NumericInput"
import { RegularTooltip } from "@/comps/RegularTooltip"
import { Reset } from "@/comps/Reset"
import { SliderMicro } from "@/comps/SliderMicro"
import { Toggle } from "@/comps/Toggle"
import { Tooltip } from "@/comps/Tooltip"
import { getDefaultURLCondition } from "@/defaults"
import { DEFAULT_DOUBLE_TAP_THRESHOLD, DEFAULT_LONG_PRESS_THRESHOLD, getDefaultSpeedSlider } from "@/defaults/constants"
import { gvar } from "@/globalVar"
import { systemIsDark } from "@/hooks/useThemeSync"
import { Context, CONTEXT_KEYS, InitialContext, StateView } from "@/types"
import { clamp, cn, isMobile, produce } from "@/utils/helper"
import { fetchView } from "@/utils/state"
import { MAX_SPEED_CHROMIUM, MIN_SPEED_CHROMIUM } from "../defaults/constants"
import { SetView, useStateView } from "../hooks/useStateView"
import { LOCALE_MAP } from "../utils/gsm"
import { IndicatorModal } from "./IndicatorModal"
import { OptionField } from "./OptionField"
import { OptionFieldLabel } from "./OptionFieldLabel"
import { OptionsSection } from "./OptionsSection"
import { SpeedPresetModal } from "./SpeedPresetModal"
import { URLModal } from "./URLModal"
import { WidgetModal } from "./WidgetModal"

function FloatingFieldValue({ className, ...props }: ComponentPropsWithoutRef<"div">) {
	return <div {...props} className={cn("relative leading-0", className)} />
}

export function SectionFlags(props: {}) {
	const [showIndicatorModal, setShowIndicatorModal] = useState(false)
	const [showGhostModal, setShowGhostModal] = useState(false)
	const [showPresetModal, setShowPresetModal] = useState(false)
	const [showWidgetModal, setShowWidgetModal] = useState(false)
	const [showMore, setShowMore] = useState(false)
	const [has, setHas] = useState(false)

	useEffect(() => {
		chrome.permissions.contains({ origins: ["https://*/*", "http://*/*"] }).then((v) => {
			setHas(v)
		})
	}, [])

	const [view, setView] = useStateView({
		language: true,
		darkTheme: true,
		fontSize: true,
		hideBadge: true,
		pinByDefault: true,
		initialContext: true,
		ghostMode: true,
		ghostModeUrlCondition: true,
		hideMediaView: true,
		freePitch: true,
		speedSlider: true,
		virtualInput: true,
		circleWidget: true,
		holdToSpeed: true,
		longPressThreshold: true,
		doubleTapThreshold: true,
		pageKeybinds: true,
	})
	const [viewAlt] = useStateView({ indicatorInit: true, hideIndicator: true })
	const hasLongPressKey = useMemo(() => (view?.pageKeybinds || []).some((kb) => kb.longPress), [view?.pageKeybinds])
	const hasDoubleTap = useMemo(() => (view?.pageKeybinds || []).some((kb) => kb.doubleTap), [view?.pageKeybinds])

	if (!view || !viewAlt) return <div></div>

	const defaultSlider = getDefaultSpeedSlider()

	return (
		<OptionsSection>
			{showIndicatorModal && (
				<IndicatorModal
					indicator={viewAlt.indicatorInit}
					onChange={(indicatorInit) => {
						setView({ indicatorInit })
					}}
					onClose={() => setShowIndicatorModal(null)}
				/>
			)}
			{showGhostModal && (
				<URLModal
					context="ghost"
					value={view.ghostModeUrlCondition || getDefaultURLCondition()}
					onClose={() => setShowGhostModal(false)}
					onReset={() => setView({ ghostModeUrlCondition: null })}
					onChange={(v) => {
						setView({ ghostModeUrlCondition: v })
					}}
				/>
			)}
			{showPresetModal && <SpeedPresetModal onClose={() => setShowPresetModal(null)} />}
			{showWidgetModal && <WidgetModal onClose={() => setShowWidgetModal(null)} />}
			<h2>{gvar.gsm.options.flags.header}</h2>
			<div className="mt-5">
				{/* Language */}
				<OptionField>
					<OptionFieldLabel>
						<span>{gvar.gsm.options.flags.language}</span>

						{gvar.gsm.options.flags._languageTooltip && <RegularTooltip title={gvar.gsm.options.flags._languageTooltip} align="right" />}
					</OptionFieldLabel>
					<select
						aria-label={gvar.gsm.options.flags.language}
						value={view.language || "detect"}
						onChange={(e) => {
							setView({ language: e.target.value })
						}}
					>
						{Object.keys(LOCALE_MAP).map((key) => (
							<option key={key} value={key} title={LOCALE_MAP[key].title}>
								{LOCALE_MAP[key].display}
							</option>
						))}
					</select>
				</OptionField>

				{/* Dark theme */}
				<OptionField>
					<span>{gvar.gsm.options.flags.darkTheme}</span>
					<div className="grid grid-cols-[max-content_max-content] items-center gap-x-1.25">
						<Toggle
							aria-label={gvar.gsm.options.flags.darkTheme}
							value={view.darkTheme ?? systemIsDark}
							onChange={(v) => {
								setView({ darkTheme: v })
							}}
						/>
						{view.darkTheme != null && (
							<Tooltip title={gvar.gsm.options.flags.darkThemeSystem}>
								<button
									aria-label={gvar.gsm.options.flags.darkThemeSystem}
									className="icon-button"
									onClick={() => {
										setView({ darkTheme: null })
									}}
								>
									<GoX size="1.6rem" />
								</button>
							</Tooltip>
						)}
					</div>
				</OptionField>

				{/* Permission */}
				{!has && (
					<OptionField>
						<OptionFieldLabel>
							<span>{gvar.gsm.options.flags.grantPermission}</span>
							<RegularTooltip title={gvar.gsm.options.flags.grantPermissionTooltip} align="right" />
						</OptionFieldLabel>
						<Toggle
							aria-label={gvar.gsm.options.flags.grantPermission}
							value={has}
							onChange={(e) => {
								chrome.permissions[has ? "remove" : "request"]({ origins: ["https://*/*", "http://*/*"] }).then((v) => {
									setHas(has ? !v : v)
								})
							}}
						/>
					</OptionField>
				)}

				{!isMobile() && (
					<>
						{/* Show badge */}
						<OptionField className="mt-7.5">
							<OptionFieldLabel>
								<span>{gvar.gsm.options.flags.showBadge}</span>
								<RegularTooltip title={gvar.gsm.options.flags.showBadgeTooltip} align="right" />
							</OptionFieldLabel>
							<Toggle
								aria-label={gvar.gsm.options.flags.showBadge}
								value={!view.hideBadge}
								onChange={(e) => {
									setView({ hideBadge: !view.hideBadge })
								}}
							/>
						</OptionField>

						{/* Show indicator */}
						<OptionField>
							<OptionFieldLabel>
								<span>{gvar.gsm.options.flags.showIndicator}</span>
								<RegularTooltip title={gvar.gsm.options.flags.showIndicatorTooltip} align="right" />
							</OptionFieldLabel>
							<FloatingFieldValue>
								<Toggle
									aria-label={gvar.gsm.options.flags.showIndicator}
									value={!viewAlt.hideIndicator}
									onChange={async (e) => {
										const view = await fetchView({ pageKeybinds: true, browserKeybinds: true, menuKeybinds: true })
										const updated = produce(view, (d) => {
											d.pageKeybinds?.forEach((kb) => {
												delete kb.invertIndicator
											})
											d.browserKeybinds?.forEach((kb) => {
												delete kb.invertIndicator
											})
											d.menuKeybinds?.forEach((kb) => {
												delete kb.invertIndicator
											})
											d.hideIndicator = !viewAlt.hideIndicator
										})

										setView(updated)
									}}
								/>
								<div className="field-gear">
									{viewAlt.hideIndicator ? null : <GearIcon className="text-foreground" onClick={() => setShowIndicatorModal(true)} />}
								</div>
							</FloatingFieldValue>
						</OptionField>

						{/* Show media view */}
						<OptionField>
							<span>{gvar.gsm.options.flags.showMediaView}</span>
							<Toggle
								aria-label={gvar.gsm.options.flags.showMediaView}
								value={!view.hideMediaView}
								onChange={(e) => {
									setView({ hideMediaView: !view.hideMediaView })
								}}
							/>
						</OptionField>
					</>
				)}

				{/* Circle widget */}
				<CircleWidget setView={setView} active={view.circleWidget} setShowWidgetModal={setShowWidgetModal} />

				{/* Pin by default */}
				<OptionField className="mt-7.5">
					<OptionFieldLabel>
						<span>{gvar.gsm.options.flags.pinByDefault}</span>
						<RegularTooltip title={`${gvar.gsm.options.flags.pinByDefaultTooltip} - ${gvar.gsm.header.pinTooltip}`} align="right" />
					</OptionFieldLabel>
					<Toggle
						aria-label={gvar.gsm.options.flags.pinByDefault}
						value={!!view.pinByDefault}
						onChange={(e) => {
							setView({ pinByDefault: !view.pinByDefault })
						}}
					/>
				</OptionField>

				{/* Initial context */}
				{!!view.pinByDefault && (
					<OptionField>
						<OptionFieldLabel className="ml-5">
							<span>{gvar.gsm.options.flags.initialContext}</span>
							{<RegularTooltip title={gvar.gsm.options.flags.initialContextTooltip} align="right" />}
						</OptionFieldLabel>
						<select
							aria-label={gvar.gsm.options.flags.initialContext}
							value={view.initialContext ?? InitialContext.PREVIOUS}
							onChange={async (e) => {
								const partial = { initialContext: parseInt(e.target.value) } as Partial<StateView>
								if (partial.initialContext === InitialContext.CUSTOM) {
									partial.customContext = (await fetchView(CONTEXT_KEYS, gvar.tabInfo.tabId)) as Context
								}
								setView(partial)
								partial.customContext && alert(gvar.gsm.options.flags.customContextTooltip)
							}}
						>
							<option value={InitialContext.PREVIOUS}>{gvar.gsm.options.flags.previousContext}</option>
							<option value={InitialContext.GLOBAL}>{gvar.gsm.options.flags.globalContext}</option>
							<option value={InitialContext.NEW}>{gvar.gsm.options.flags.newContext}</option>
							<option value={InitialContext.CUSTOM}>{gvar.gsm.options.flags.customContext}</option>
						</select>
					</OptionField>
				)}

				{/* Ghost mode */}
				<OptionField>
					<OptionFieldLabel>
						<span>{gvar.gsm.options.flags.ghostMode}</span>
						<RegularTooltip title={gvar.gsm.options.flags.ghostModeTooltip} align="right" />
					</OptionFieldLabel>
					<FloatingFieldValue>
						<Toggle
							aria-label={gvar.gsm.options.flags.ghostMode}
							value={!!view.ghostMode}
							onChange={(e) => {
								setView({ ghostMode: !view.ghostMode })
							}}
						/>
						<div className="field-gear">
							{!view.ghostMode ? null : <GearIcon className="text-foreground" onClick={(e) => setShowGhostModal(true)} />}
						</div>
					</FloatingFieldValue>
				</OptionField>

				{/* Speed changes pitch */}
				<OptionField className="mt-7.5">
					<OptionFieldLabel>
						<span>{gvar.gsm.command.speedChangesPitch}</span>
						<RegularTooltip title={gvar.gsm.command.speedChangesPitchTooltip} align="right" />
					</OptionFieldLabel>
					<Toggle
						aria-label={gvar.gsm.command.speedChangesPitch}
						value={!!view.freePitch}
						onChange={(e) => {
							setView({ freePitch: !view.freePitch })
						}}
					/>
				</OptionField>

				{/* Speed slider  */}
				<OptionField className="mb-2.5">
					<span>{gvar.gsm.options.flags.speedSlider}</span>
					{view.speedSlider ? (
						<div className="grid grid-cols-[8rem_max-content] gap-x-1.25">
							<Minmax
								realMin={MIN_SPEED_CHROMIUM}
								realMax={MAX_SPEED_CHROMIUM}
								min={view.speedSlider?.min ?? defaultSlider.min}
								max={view.speedSlider?.max ?? defaultSlider.max}
								onChange={(min: number, max: number) => {
									setView({
										speedSlider: { min, max },
									})
								}}
								defaultMin={defaultSlider.min}
								defaultMax={defaultSlider.max}
							/>
							<Tooltip title={gvar.gsm.token.delete}>
								<button
									aria-label={gvar.gsm.token.delete}
									className="icon-button"
									onClick={() => {
										setView({ speedSlider: null })
									}}
								>
									<GoX size="1.6rem" />
								</button>
							</Tooltip>
						</div>
					) : (
						<Toggle
							aria-label={gvar.gsm.options.flags.speedSlider}
							value={!!view.speedSlider}
							onChange={(v) => setView({ speedSlider: view.speedSlider ? null : getDefaultSpeedSlider() })}
						/>
					)}
				</OptionField>

				{/* Hold to speed  */}
				<OptionField className="mb-7.5">
					<OptionFieldLabel>
						<span>{gvar.gsm.options.flags.holdToSpeedUp}</span>
						<RegularTooltip title={gvar.gsm.options.flags.holdToSpeedUpTooltip} align="right" />
					</OptionFieldLabel>

					{view.holdToSpeed ? (
						<div className="grid grid-cols-[4rem_max-content] gap-x-1.25">
							<NumericInput noNull={true} min={0.1} max={20} value={view.holdToSpeed} onChange={(v) => setView({ holdToSpeed: v })} />
							<button
								aria-label={gvar.gsm.token.delete}
								className="icon-button"
								onClick={() => {
									setView({ holdToSpeed: null })
								}}
							>
								<GoX size="1.6rem" />
							</button>
						</div>
					) : (
						<Toggle aria-label={gvar.gsm.options.flags.holdToSpeedUp} value={false} onChange={() => setView({ holdToSpeed: 2 })} />
					)}
				</OptionField>

				{!showMore ? (
					<button aria-label={gvar.gsm.token.showMore} className=" button-control p-3 py-2" onClick={() => setShowMore(true)}>
						{gvar.gsm.token.showMore}
					</button>
				) : (
					<>
						{/* Long-press threshold */}
						{!isMobile() && hasLongPressKey && (
							<OptionField>
								<OptionFieldLabel>
									<span>{gvar.gsm.options.flags.longPressThreshold}</span>
									<RegularTooltip title={gvar.gsm.options.flags.longPressThresholdTooltip} align="right" />
								</OptionFieldLabel>

								<div className="grid grid-cols-[max-content_max-content] items-center gap-x-1.25">
									<NumericInput
										noNull={true}
										min={0.1}
										max={3}
										value={(view.longPressThreshold ?? DEFAULT_LONG_PRESS_THRESHOLD) / 1000}
										onChange={(v) => setView({ longPressThreshold: Math.round(v * 1000) })}
									/>
									<Reset
										active={view.longPressThreshold != undefined}
										onClick={() => {
											setView({ longPressThreshold: null })
										}}
									/>
								</div>
							</OptionField>
						)}

						{!isMobile() && hasDoubleTap && (
							<OptionField>
								<OptionFieldLabel>
									<span>{gvar.gsm.options.flags.doubleTapThreshold}</span>
									<RegularTooltip title={gvar.gsm.options.flags.doubleTapThresholdTooltip} align="right" />
								</OptionFieldLabel>

								<div className="grid grid-cols-[max-content_max-content] items-center gap-x-1.25">
									<NumericInput
										noNull={true}
										min={0.06}
										max={3}
										value={(view.doubleTapThreshold ?? DEFAULT_DOUBLE_TAP_THRESHOLD) / 1000}
										onChange={(v) => setView({ doubleTapThreshold: Math.round(v * 1000) })}
									/>
									<Reset
										active={view.doubleTapThreshold != undefined}
										onClick={() => {
											setView({ doubleTapThreshold: null })
										}}
									/>
								</div>
							</OptionField>
						)}

						{!isMobile() && (
							<>
								{/* Font size */}
								<OptionField>
									<span>{gvar.gsm.options.flags.textSize}</span>
									<SliderMicro
										value={view.fontSize ?? 1.0}
										onChange={(v) => {
											setView({ fontSize: clamp(0.9, 1.1, v) })
											// setView({fontSize: clamp(0.5, 3, v)})
										}}
										default={1.0}
										sliderMin={0.9}
										sliderMax={1.1}
										sliderStep={0.01}
									/>
								</OptionField>

								{/* Keyboard input */}
								<OptionField>
									<OptionFieldLabel>
										<span>{gvar.gsm.options.flags.keyboardInput}</span>
										<RegularTooltip title={gvar.gsm.options.flags.keyboardInputTooltip} align="right" />
									</OptionFieldLabel>
									<select
										aria-label={gvar.gsm.options.flags.keyboardInput}
										value={view.virtualInput ? "v" : "q"}
										onChange={async (e) => {
											setView({ virtualInput: e.target.value === "v" })
										}}
									>
										<option value="q">{gvar.gsm.options.flags.qwerty}</option>
										<option value="v">{gvar.gsm.options.flags.virtual}</option>
									</select>
								</OptionField>
							</>
						)}

						{/* Speed presets */}
						<OptionField>
							<span>{gvar.gsm.options.flags.speedPresets}</span>
							<GearIcon className="text-foreground" onClick={(e) => setShowPresetModal(true)} />
						</OptionField>
					</>
				)}
			</div>
		</OptionsSection>
	)
}

function CircleWidget(props: { active?: boolean; setView: SetView; setShowWidgetModal: (v: boolean) => void }) {
	return (
		<OptionField>
			<OptionFieldLabel>
				<span>{gvar.gsm.options.flags.widget.option}</span>
				<RegularTooltip
					title={gvar.gsm.options.flags.widget.optionTooltip.concat(
						isMobile() ? gvar.gsm.options.flags.widget.movementMobile : gvar.gsm.options.flags.widget.movementDesktop,
					)}
					align="right"
				/>
			</OptionFieldLabel>
			<FloatingFieldValue>
				<Toggle
					aria-label={gvar.gsm.options.flags.widget.option}
					value={!!props.active}
					onChange={(e) => {
						props.setView({ circleWidget: !props.active })
					}}
				/>
				<div className="field-gear">
					{!!props.active && <GearIcon className="text-foreground" onClick={(e) => props.setShowWidgetModal(true)} />}
				</div>
			</FloatingFieldValue>
		</OptionField>
	)
}
