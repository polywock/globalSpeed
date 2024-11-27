
import { TiDelete } from "react-icons/ti"
import { useStateView } from "src/hooks/useStateView"
import "./QrPromo.css"
import { pushView } from "src/utils/state"
import { isFirefox, isMac, isMobile } from "src/utils/helper"

const ALWAYS_SHOW = false  

let wasHidden = false 

export function QrPromo(props: {}) {
    const [view, setView] = useStateView({qrCodeHide: true, speedChangeCounter: true, qrCodeSeenCounter: true})
    if (!view || wasHidden) return null 

    if (!ALWAYS_SHOW && (view.qrCodeHide || !validUserAgent() || (view.speedChangeCounter || 0) < 20 || view.qrCodeSeenCounter > 60)) {
        wasHidden = true 
        document.documentElement.classList.add("noBottomBorderMediaItem")
        return null 
    }
    !ALWAYS_SHOW && indicateSeen(view.qrCodeSeenCounter)

    return <div className="QrPromo">
        <div>
            <div className="top">{gvar.gsm.options.flags.qrCodeTop}</div>
            <div className="bottom">{gvar.gsm.options.flags.qrCodeBottom}</div>
        </div>
        <img onClick={() => {
            chrome.tabs.create({url: "https://www.microsoft.com/edge/emmx/globalspeedcollaboration"})
        }} src={chrome.runtime.getURL("icons/qr.png")}/>
        <button onClick={() => {
            setView({qrCodeHide: true})
        }} className="icon"><TiDelete size="30px"/></button>
    </div>
}

let ranAlready = false 
function indicateSeen(seenX: number) {
    if (ranAlready) return 
    ranAlready = true 
    pushView({override: {qrCodeSeenCounter: (seenX || 0) + 1}})
}

function validUserAgent() {
    return !isMobile() && !isFirefox()
}