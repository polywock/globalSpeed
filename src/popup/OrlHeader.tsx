
import { BsXCircle, BsArrowUpCircle } from "react-icons/bs"
import { useStateView } from "src/hooks/useStateView"
import "./OrlHeader.css"

type OrlHeaderProps = {}
  
export function OrlHeader(props: OrlHeaderProps) {
    const [view, setView] = useStateView({hasOrl: true, minimizeOrlBanner: true, hideOrlBanner: true})
    if (!view || !view.hasOrl || view.hideOrlBanner) return <div/>
    const m = view.minimizeOrlBanner
    
    return <div className="OrmHeader" onClick={e => {
        setView({minimizeOrlBanner: m ? null : true})
    }}>
        {m ? null : <>
            <span>{gvar.gsm.options.rules.status}</span>
            <BsArrowUpCircle size={"1.285rem"}/>
            <BsXCircle onClickCapture={(e: React.MouseEvent) => {
                setView({hasOrl: false})
                e.stopPropagation()
            }} size={"1.285rem"}/>
        </>}
    </div>
}