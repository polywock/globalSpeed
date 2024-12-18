
import { ModalBase } from "./ModalBase"
import { FaCheck } from "react-icons/fa"
import "./Menu.css"

export type MenuProps = {
  position: {x: number, y: number},
  onClose: () => void, 
  onSelect: (name: string) => void, 
  items: {name: string, checked?: boolean, close?: boolean, preLabel?: string, label?: string | React.ReactElement}[],
  menuRef: React.Ref<HTMLDivElement>
}

export const Menu = (props: MenuProps) => {

  return <ModalBase color={"transparent"} onClose={props.onClose}>
    <div ref={props.menuRef} style={{left: `${props.position.x}px`, top: `${props.position.y}px`}} className="Menu">
      {props.items.map(v => {
        const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
          props.onSelect(v.name)
          if (v.close) props.onClose()
        }

        return <div key={v.name} onClick={handleClick}>
          <span style={{display: "inline-block", minWidth: "20px"}}>{v.checked === true ? <FaCheck/> : <div>{v.preLabel ?? ""}</div>}</span>
          <span>{v.label ?? v.name}</span>
        </div>
      })}
    </div>
  </ModalBase>
}