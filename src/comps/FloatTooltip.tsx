import "./FloatTooltip.scss"


type FloatTooltipProps = {
  value: string
}

export const FloatTooltip = (props: FloatTooltipProps) => {
  return <div className="FloatTooltip">
    <div>
      {props.value}
    </div>
  </div>
}