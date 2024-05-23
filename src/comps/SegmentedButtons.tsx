
import "./SegmentedButtons.css"

export const SegmentedButtons = (props: {numbers: number[], value: number, onChange: (newNumber: number) => void}) => {
  return <div className="SegmentedButtons">
    {props.numbers.map((v, i) => (
      <button className={props.value === v ? "selected" : ""} key={i} onClick={e => {props.onChange(v)}}>{v}</button>
    ))}
  </div>
}