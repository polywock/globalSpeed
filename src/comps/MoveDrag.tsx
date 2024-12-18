import { VscGripper } from "react-icons/vsc"
import { useRef, MutableRefObject, useEffect } from "react"
import "./MoveDrag.css"
import { Tooltip } from "./Tooltip"

type MoveDragProps = {
  onMove: (newIndex: number) => void
  itemRef: MutableRefObject<HTMLElement>
  listRef: MutableRefObject<HTMLElement>
  setFocus: (focused: boolean) => void 
}

type Env = {
  focused?: HTMLElement
  props?: MoveDragProps
}

export function MoveDrag(props: MoveDragProps) {
  const env = useRef({setFocus: props.setFocus} as Env).current
  env.props = props

  useEffect(() => {
    const handlePointerUp = (e: PointerEvent) => {
      if (!env.focused) return 
      env.props.setFocus(false)
      env.focused = null 
      document.documentElement.classList.remove("dragging")
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!env.focused) return 
      let itemIdx = 0 
      const items = [...props.listRef.current.children].map((v, i) => {
        const b = v.getBoundingClientRect()
        const focused = v === env.focused
        if (focused) {
          itemIdx = i 
        }
        return {y: b.y + b.height / 2, i: i, focused}
      })
      
      // determine new position. 
      let cursorIdx = 0 
      for (let item of items) {
        if (e.clientY < item.y) break
        cursorIdx++ 
      }

      const delta = cursorIdx - itemIdx

      let newIndex = itemIdx 
      if (delta >= 2) {
          newIndex = itemIdx + delta - 1
      } else if (delta <= -1) {
        newIndex = itemIdx + delta
      }

      if (newIndex === itemIdx) return 

      env.props.onMove(newIndex)
    }


    window.addEventListener("pointerup", handlePointerUp, true)
    window.addEventListener("pointermove", handlePointerMove, true)

    return () => {
      window.removeEventListener("pointerup", handlePointerUp, true)
      window.removeEventListener("pointermove", handlePointerMove, true)
    }
  }, [])


  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!props.itemRef.current || !props.listRef.current) return 
    props.setFocus(true)
    document.documentElement.classList.add("dragging")
    env.focused = props.itemRef.current 
  }

  return (
    <button onPointerDown={handlePointerDown} className="MoveDrag icon">
        <VscGripper size="1.42rem"/>
    </button>
)
}