
import { ModalBase } from "./ModalBase"
import { FaCheck } from "react-icons/fa"
import "./Menu.scss"

export const Menu = (props: {
  position: {x: number, y: number},
  onClose: () => void, 
  onSelect: (name: string) => void, 
  items: {name: string, checked?: boolean, label?: string | React.ReactElement}[],
}) => {

  return <ModalBase color={"transparent"} onClose={props.onClose}>
    <div style={{left: `${props.position.x}px`, top: `${props.position.y}px`}} className="Menu">
      {props.items.map(v => {
        const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
          e.target === e.currentTarget && props.onSelect(v.name)
        }

        return <div key={v.name}>
          <span onClick={handleClick}style={{display: "inline-block", minWidth: "20px"}}>{v.checked === true ? <FaCheck/> : <div/>}</span>
          <span onClick={handleClick}>{v.label ?? v.name}</span>
        </div>
      })}
    </div>
  </ModalBase>
}