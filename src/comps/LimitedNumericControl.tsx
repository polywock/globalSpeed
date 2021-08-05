import "./LimitedNumericControl.scss"

export const LimitedNumericControl = (props: {numbers: number[], value: number, onChange: (newNumber: number) => void}) => {
  return <div className="LimitedNumericControl">
    {props.numbers.map((v, i) => (
      <button className={props.value === v ? "selected" : ""} key={i} onClick={e => {props.onChange(v)}}>{v}</button>
    ))}
  </div>
}