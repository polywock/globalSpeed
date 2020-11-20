import "./SpeedControl.scss"
import { NumericControl } from "../comps/NumericControl"
import { getDefaultSpeedPresets } from "../defaults"
import { useStateView } from "../hooks/useStateView"

type SpeedControlProps = {
  onChange: (newSpeed: number) => any,
  speed: number 
}

export function SpeedControl(props: SpeedControlProps) {
  const [view] = useStateView({speedPresets: true, speedSmallStep: true, speedBigStep: true})
  if (!view) return null 
  
  return <div className="SpeedControl">
    <div className="options">
      {(view.speedPresets?.length === 12 ? view.speedPresets : getDefaultSpeedPresets()).map(v => (
        <div 
          key={v}
          tabIndex={0}
          className={props.speed === v ? "selected" : ""}
          onClick={() => props.onChange(v)}
        >{v.toFixed(2)}</div> 
      ))}
    </div>
    <NumericControl 
      value={props.speed} 
      onChange={newValue => props.onChange(newValue)}
      smallStep={view.speedSmallStep || 0.01}
      largeStep={view.speedBigStep || 0.1}
      min={0.07}
      max={16}
      inputNoNull={true}
      rounding={2}
    />
  </div>
}