import { GiAnticlockwiseRotation } from "react-icons/gi";

type ResetProps = {
  onClick?: () => void,
  active?: boolean
}

export function Reset(props: ResetProps) {
  return <GiAnticlockwiseRotation size={15}  className={`reset ${props.active ? "active" : ""}`} onClick={props.onClick}/>
}