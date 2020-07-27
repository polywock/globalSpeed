
import React, { useState } from "react"
import ReactDOM from "react-dom"
import { isFirefox } from "../utils/helper"
import { requestCreateTab } from "../utils/browserUtils"
import { GoZap } from "react-icons/go"
import "./faqs.scss"
import { FaMousePointer } from "react-icons/fa"

function Faqs(props: {}) {
  return <div className="Faqs">
    <Faq q={"Do you collect any data?"} a={<div>No, you can read the privacy policy <a href={"https://github.com/polywock/globalSpeed/blob/master/PRIVACY_POLICY.md"}>here</a>. In short, Global Speed does not collect any data, nor does it send any data to any remote servers.</div>}/>
    <Faq q={"Why do you need permissions for all sites? "} a={<div>It's called <i>Global</i> Speed for a reason. It's supposed to work on all websites. If you're on Chrome or Edge, you can right click the extension icon to restrict the Site Access to particular websites.</div>}/>
    <Faq q={"Why doesn't it work for certain videos? "} a={<div>Global Speed doesn't support flash videos, only HTML5 video/audio. Some websites listen to speed change events and revert the speed. Or they aggressively set the speed. To bypass this, try enabling <i>ghost mode</i> in the settings page.</div>}/>
    {!isFirefox() && <>
      <Faq q={"Can I use it with local files or in incognito mode? "} a={<div>Yes, but you'll need to explicitly enable it in <a href={`chrome://extensions/?id=${chrome.runtime.id}`} onContextMenu={e => e.preventDefault()} onMouseDown={e => {
        e.preventDefault()
        requestCreateTab(`chrome://extensions/?id=${chrome.runtime.id}`)
      }}>extension page</a>.</div>}/>
      <Faq q={"Why can't I make the video fullscreen when I capture the tab's audio? "} a={<div>The API does not allow entering fullscreen if the tab's audio is already captured. You need to first enter fullscreen and then capture the audio using the optional shortcut key.</div>}/>
      <Faq q={"I added a shortcut key to capture the tab's audio, but it doesn't work unless I first click the extension for that tab. "} a={<div>The API used to manipulate the tab's audio requires the user to first invoke the extension for that tab. Global shortcut keys can be used to invoke the extension.</div>}/>
    </>}
    {isFirefox() && <>
        <Faq q={"Can I use it in private mode? "} a={<div>Yes, but you'll need to enable it in the addon manager page, which can be accessed by going to the following URL. <code>about:addons</code>.</div>}/>
        <Faq q={"Why doesn't the Firefox version support audio FX and global shortcut keys? "} a={<div>Firefox doesn't support the required APIs. </div>}/>
    </>}
    <Faq q={"Why are the media shortcut keys applying to the wrong video/audio? "} a={<div>If there multiple media elements on the page, Global Speed tends to prioritize the longest one. If it's wrong, you can select {<FaMousePointer size={20} color={"#02a"}/>} the video/audio you want prioritized.</div>}/>
    <Faq q={"Why are my colors weird/inverted? "} a={<div>You might have enabled a filter. You can disable filters by opening the FX <GoZap color={"#02a"} size={20}/> section. </div>}/>
    <Faq q={"I got a different problem. "} a={<div>Try reinstalling the extension. If that doesn't fix it, maybe create an issue on the Github page.</div>}/>
  </div>
}

type FaqProps = {
  q: string,
  a: React.ReactElement
}

function Faq(props: FaqProps) {
  const [hidden, setHidden] = useState(true)
  return <div className="Faq">
    <div className="header">
      <button onClick={() => setHidden(!hidden)}>{hidden ? "+" : "-"}</button>
      <div>{props.q}</div>
    </div>
    {!hidden && props.a} 
  </div>
} 


ReactDOM.render(<Faqs/>, document.querySelector("#root"))