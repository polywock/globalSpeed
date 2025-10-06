import { CSSProperties } from "react"
import { getDefaultSpeedPresets } from "src/defaults/constants"
import { MAX_SPEED_CHROMIUM, MIN_SPEED_CHROMIUM } from "../defaults/constants"
import { useStateView } from "../hooks/useStateView"
import { BsMusicNoteList } from "react-icons/bs"
import { produce } from "immer"
import { replaceArgs } from "src/utils/helper"
import { clamp, domRectGetOffset, feedbackText, isFirefox, isMobile } from "src/utils/helper"
import { NumericInput } from "src/comps/NumericInput"
import { FaAngleDoubleLeft, FaAngleDoubleRight, FaAngleLeft, FaAngleRight, FaPause } from "react-icons/fa"
import { getLatestActiveTabInfo } from "../utils/browserUtils"
import { generateUrlPart } from "../defaults"
import { gvar } from "../globalVar"
import "./SpeedControl.css"

type SpeedControlProps = {
  onChange: (newSpeed: number) => any,
  speed: number
}

export function SpeedControl(props: SpeedControlProps) {
  const [view, setView] = useStateView({fontSize: true, speedPresets: true, speedSmallStep: true, speedBigStep: true, speedSlider: true, freePitch: true, speedPresetRows: true, speedPresetPadding: true})
  if (!view) return null 

  let presets = view.speedPresets?.length === 12 ? view.speedPresets : getDefaultSpeedPresets()
  presets = presets.slice(0, clamp(1, 4, view.speedPresetRows ?? 4) * 3)

  const handleAddDelta = (delta: number) => {
    let value = props.speed
    if (value != null) {
      props.onChange(value + delta)
    }
  }

  const smallStep = view.speedSmallStep || 0.01
  const largeStep = view.speedBigStep || 0.1

  let padding = (view.speedPresetPadding ?? 0) * (view.fontSize ?? 1)
  if (isMobile()) padding = Math.max(padding, 10)
  
  return <div className="SpeedControl" style={{"--padding": `${padding}px`} as CSSProperties}>

    {/* Presets */}
    <div className="options">
      {presets.map((v, i) => (
        <button 
          key={i}
          className={props.speed === v ? "selected" : ""}
          onClick={() => props.onChange(v)}
          onContextMenu={e => {
            e.preventDefault()
            if (isFirefox()) return 
            const answer = prompt(replaceArgs(gvar.gsm.token.replaceWith, [v.toString()]))
            let resetToDefault = false 

            const n = parseFloat(answer ?? "")
            if (isNaN(n)) {
              resetToDefault = true
              answer?.trim() && alert(gvar.gsm.token.invalidNumber)
            }
            if (n > MAX_SPEED_CHROMIUM) {
              resetToDefault = true
              alert(`<= ${MAX_SPEED_CHROMIUM}`)
            }
            if (n < MIN_SPEED_CHROMIUM) {
              resetToDefault = true
              alert(`>= ${MIN_SPEED_CHROMIUM}`)
            }

            setView({
              speedPresets: produce(presets, d => {
                d[i] = resetToDefault ? getDefaultSpeedPresets()[i] : n 
              })
            })
          }}
        >{v.toFixed(2)}</button> 
      ))}
    </div>

    {/* Controls */}
    <div className="NumericControl" onWheel={e => {
    if (e.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return 
    const speedDelta = (e.deltaY / 1080) * -0.15
    props.onChange(clamp(MIN_SPEED_CHROMIUM, MAX_SPEED_CHROMIUM, props.speed + speedDelta))
  }}>
      <button onClick={() =>  handleAddDelta(-largeStep)}><FaAngleDoubleLeft size={"1.14rem"}/></button>
      <button onClick={() =>  handleAddDelta(-smallStep)}><FaAngleLeft size={"1.14rem"}/></button>
      <NumericInput rounding={2} noNull={true} min={MIN_SPEED_CHROMIUM} max={MAX_SPEED_CHROMIUM} value={props.speed} onChange={v => {
        props.onChange(v)
      }}/>
      <button onClick={() =>  handleAddDelta(smallStep)}><FaAngleRight size={"1.14rem"}/></button>
      <button onMouseDown={() => {}} onClick={() =>  handleAddDelta(largeStep)}><FaAngleDoubleRight size={"1.14rem"}/></button>
    </div>

    {/* Pause Speed for Current Website Button */}
    <div className="pause-site-button">
      <button 
        title="暂停当前网站倍速"
        onClick={async () => {
          try {
            // 获取当前标签页信息
            const tabInfo = await getLatestActiveTabInfo();
            if (!tabInfo || !tabInfo.url) {
              alert("无法获取当前网页信息");
              return;
            }
            
            // 获取当前URL规则
            const state = await chrome.storage.local.get(["urlRules"]);
            let urlRules = state.urlRules || [];
            
            // 创建新规则
            const newRule = {
              id: Math.random().toString(36).substring(2, 15),
              enabled: true,
              type: "SPEED",
              overrideSpeed: 1,
              condition: {
                block: false,
                parts: [generateUrlPart(new URL(tabInfo.url).origin)]
              },
              strictness: 3
            };
            
            // 添加新规则
            urlRules.push(newRule);
            
            // 保存规则
            await chrome.storage.local.set({ urlRules });
            
            // 通知用户
            alert("已为当前网站添加倍速暂停规则，刷新页面后生效");
            
            // 关闭弹窗
            window.close();
          } catch (error) {
            console.error("添加规则失败:", error);
            alert("添加规则失败");
          }
        }}
      >
        <svg t="1759770851288" className="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" style={{marginRight: "5px"}}>
          <path d="M128 0h253.155556v1024H128V0z m512 0h256v1024h-256V0z" fill="#ffffff" p-id="4685"></path>
        </svg>
        暂停当前网站倍速
      </button>
    </div>

    {/* Slider */}
    {!!view.speedSlider && (
      <div className="slider">
        <BsMusicNoteList title={gvar.gsm.command.speedChangesPitch} size={"1.2rem"} className={`${view.freePitch ? "active" : ""}`} onClick={(e: React.MouseEvent<SVGElement>) => {
          if (!view.freePitch) {
            feedbackText(gvar.gsm.command.speedChangesPitch, domRectGetOffset((e.currentTarget as any as HTMLButtonElement).getBoundingClientRect(), 8, 30))
          }
          setView({freePitch: !view.freePitch})
        }}/>
        <input step={0.01} type="range" min={view.speedSlider.min} max={view.speedSlider.max} value={props.speed} onChange={e => {
          props.onChange(e.target.valueAsNumber)
        }}/>
      </div>
    )}
  </div>
}