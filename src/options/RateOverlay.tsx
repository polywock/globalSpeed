import { useState } from "react"
import { FaStar } from "react-icons/fa";
import { pushView } from "../background/GlobalState";
import { useStateView } from "../hooks/useStateView";
import { requestCreateTab } from "../utils/browserUtils";
import "./RateOverlay.scss"

const FIRST_USE_GRACE = 30 * 86400000
const CLICK_GRACE = 6 * 30 * 86400000


export function RateOverlay(props: {}) {
  const [idx, setIdx] = useState(null as [number])
  
  const [view] = useStateView({clickedRating: true, firstUse: true})
  if (!view) return null

  const storeLink = chrome.runtime.id === "jpbjcnkcffbooppibceonlgknpkniiff" ? (
    "https://chrome.google.com/webstore/detail/global-speed/jpbjcnkcffbooppibceonlgknpkniiff"
  ) : (
    chrome.runtime.id === "mjhlabbcmjflkpjknnicihkfnmbdfced" ? (
      "https://microsoftedge.microsoft.com/addons/detail/global-speed/mjhlabbcmjflkpjknnicihkfnmbdfced"
    ) : (
      chrome.runtime.id !== "{f4961478-ac79-4a18-87e9-d2fb8c0442c4}" ? null : (
        "https://addons.mozilla.org/en-US/firefox/addon/global-speed"
      )
    )
  )
 
  
  const passedFirstUsePeriod = new Date().getTime() - (view.firstUse || 1603819820656) > FIRST_USE_GRACE
  const passedClickedPeriod = new Date().getTime() - (view.clickedRating || 0) > CLICK_GRACE


  if (!(passedFirstUsePeriod && passedClickedPeriod && storeLink)) return null 

  return (
    <div id="RateOverlay" onClick={e => {
      pushView({override: {clickedRating: new Date().getTime()}})
      requestCreateTab(storeLink)
    }}>
      <FaStar className={!idx ? "" : idx[0] >= 0 ? "active" : ""} onMouseEnter={() => setIdx([0])}/>
      <FaStar className={!idx ? "" : idx[0] >= 1 ? "active" : ""} onMouseEnter={() => setIdx([1])}/>
      <FaStar className={!idx ? "" : idx[0] >= 2 ? "active" : ""} onMouseEnter={() => setIdx([2])}/>
      <FaStar className={!idx ? "" : idx[0] >= 3 ? "active" : ""} onMouseEnter={() => setIdx([3])}/>
      <FaStar className={!idx ? "" : idx[0] >= 4 ? "active" : ""} onMouseEnter={() => setIdx([4])}/>
    </div>
  )
}