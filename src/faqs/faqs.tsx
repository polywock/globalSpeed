
import { useState, ReactElement } from "react"
import ReactDOM from "react-dom"
import { isFirefox } from "../utils/helper"
import { requestCreateTab } from "../utils/browserUtils"
import { GoPin, GoZap } from "react-icons/go"
import { FaMousePointer, FaPowerOff } from "react-icons/fa"
import "./faqs.scss"


function Faqs(props: {}) {
  return <div className="Faqs">
    <Group label="privacy">
      <Item q={"Do you collect any data?"} a={<div>No, you can read the privacy policy <a href={"https://github.com/polywock/globalSpeed/blob/master/PRIVACY_POLICY.md"}>here</a>. In short, Global Speed does not collect any data, nor does it send any data to any remote servers.</div>}/>
      <Item q={"Why do you need permissions for all sites? "} a={<div>It's called <i>Global</i> Speed for a reason. It's supposed to work on all websites. If you're on Chrome or Edge, you can right click the extension icon to restrict the Site Access to particular websites.</div>}/>
    </Group>
    <Group label="general">
      {!isFirefox() && <>
        <Item q={"Can I use it with local files or in incognito mode? "} a={<div>Yes, but you'll need to explicitly enable it in <a href={`chrome://extensions/?id=${chrome.runtime.id}`} onContextMenu={e => e.preventDefault()} onMouseDown={e => {
          e.preventDefault()
          requestCreateTab(`chrome://extensions/?id=${chrome.runtime.id}`)
        }}>extension page</a>.</div>}/>
      </>}
      {isFirefox() && <>
        <Item q={"Can I use it in private mode? "} a={<div>Yes, but you'll need to enable it in the addon manager page, which can be accessed by going to the following URL. <code>about:addons</code>.</div>}/>
        <Item q={"Why doesn't the Firefox version support audio FX and global shortcut keys? "} a={<div>Firefox doesn't support the required APIs. </div>}/>
      </>}
      <Item q={"Why are my colors weird/inverted? "} a={<div>You might have enabled a filter. You can disable filters by opening the FX <GoZap color={"#02a"} size={20}/> section. </div>}/>
      <Item q={"How do I use filters on PiP videos? "} a={<div>If you're on Windows, there's a <a href="https://github.com/polywock/globalSpeed/issues/68#issuecomment-815925089">method</a> proposed by @Pawloland.</div>}/>
      <Item q={"I got a different problem. "} a={<div>Try reinstalling the extension. If that doesn't fix it, maybe create an <a href="https://github.com/polywock/globalSpeed/issues">issue on the Github page.</a></div>}/>
    </Group>
    <Group label="speed control">
      <Item q={"Why doesn't it work for certain videos? "} a={<div>Global Speed doesn't support flash videos, only HTML5 video/audio. Some websites listen to speed change events and revert the speed. Or they aggressively set the speed. To bypass this, try enabling <i>ghost mode</i> in the options page (it's hidden under the three dots [...]).</div>}/>
      <Item q={"What does pinning do? "} a={<div>By default all tabs share the same context (speed, filters, etc). If you want a tab to have unique settings, you can <GoPin color={"#02a"} size="20px"/> pin it. Useful if you want separate speeds on different tabs. If you prefer all tabs have different speed values, you can enable "pin by default" in the settings page.</div>}/>
      <Item q={"How do I change speed without preserving pitch? "} a={<div>You can disable "preserve pitch" in the settings page, or create a hotkey to toggle it.</div>}/>
      <Item q={"How do I configure the speed presets?"} a={<div>Open the options page and click on the three dots [...] to open the hidden options. The speed presets can be configured under the "speed presets" section.</div>}/>
      <Item q={"How do I enable the slider control?"} a={<div>Open the options page and click on the three dots [...] to open the hidden options. Under the "speed presets" section, you can enable the slider control by ticking the checkbox. By default, the slider goes between 0.5 and 1.5 speed. The slider control includes a convenient "preserve pitch" control. If you disable preserve pitch, the slider could make music more enjoyable.</div>}/>
    </Group>
    <Group label="hotkeys">
      <Item q={"How do I block hotkeys on some sites? "} a={<ul>
        <li>In this example, I'll block hotkeys for stadia.com, a game streaming website.</li>
        <li>1. Click on the <code>{"-- 0 --"}</code> button at the bottom-right of the Shortcut Editor section. Here we can add conditions that need to met for the hotkeys to remain enabled.</li>
        <li>3. Since we want the hotkeys to remain enabled only if the website isn't "stadia.com". Add a not equals condition {"[ != ]"} if the URL contains the "stadia.com" keyword.</li>
        <li style={{backgroundColor: "yellow", fontWeight: "bolder", padding: "5px"}}>Note: If you add multiple conditions, you need to specify whether all conditions should be met or only one. If we want the hotkeys to only enabled if the website isn't {"[ != ]"} stadia.com AND isn't {"[ != ]"} miniclip.com, we would select "all (AND)" option. <div style={{marginTop: "10px"}}>On the other hand, if we wanted the hotkeys to only be enabled if the website's URL matches {"[ == ]"} specific websites like youtube.com OR twitch.tv, we would require only a single condition to be met and thus select the "any (OR)" option.</div></li>
        <li style={{backgroundColor: "yellow", fontWeight: "bolder", padding: "5px", marginTop: "10px"}}>Note: You can also add URL conditions to specific hotkeys by hovering over a hotkey item and clicking on the top-right red botton.</li>
      </ul>}/>
      <Item q={"I can't type because the Global Speed hotkeys are being triggered."} a={<ol>
        <li>Suspend the extension using the "state" <FaPowerOff color={"#02a"} size="17px"/> button or hotkey (Shift + Q by default). This disables all hotkeys, except the "state" hotkey (so you can reactivate the extension). </li>
        <li>Or, add a {"[ != ]"} URL rule to the hotkeys so it doesn't run on that website.</li>
      </ol>}/>
      <Item q={"Why are the media shortcut keys applying to the wrong video/audio? "} a={<div>If there multiple media elements on the page, Global Speed tends to prioritize the longest one. If it's wrong, you can select {<FaMousePointer size={20} color={"#02a"}/>} the video/audio you want prioritized.</div>}/>
      <Item q={"How do I control background music/video while using another tab? "} a={<div>Select the video/audio you want to control using the {<FaMousePointer size={20} color={"#02a"}/>} button.</div>}/>
      {!isFirefox() && (
        <Item q={"How do I control background music or PiP videos while using another program? "} a={<div>Create global hotkeys in the settings page, and select the video/audio you want to control using the {<FaMousePointer size={20} color={"#02a"}/>} button. <a href="https://www.youtube.com/watch?v=EZA-TnVAyDo">Youtube demo.</a></div>}/>
      )}
    </Group> 
    {!isFirefox() && <>
    <Group label="audio effects">
      <Item q={"What's the difference between standard and HD pitch shifter? "} a={<div>The standard one uses <a href="https://github.com/cwilso/Audio-Input-Effects/blob/master/js/jungle.js">Cwilso's Jungle algorithm.</a> The HD version uses <a href="https://github.com/cutterbl/SoundTouchJS">Cutterbl's port</a> of <a href="https://www.surina.net/soundtouch/">Soundtouch</a>. The HD one has less reverb, but also has a small delay.</div>}/>
      <Item q={"Why can't I make the video fullscreen when I use audio effects? "} a={<div>The API does not allow entering fullscreen if the tab's audio is already captured. You need to first enter fullscreen and then capture the audio using the optional "tab capture" shortcut key.</div>}/>
      <Item q={`I added a "tab capture" hotkey, but it doesn't work unless I first click the extension icon.`} a={<div>The API used to manipulate the tab's audio requires the user to first invoke the extension. To invoke Global Speed, either click on the extension icon. Or, setup a global "tab capture" hotkey. Unlike local hotkeys, global hotkeys can be used to invoke an extension.</div>}/>
    </Group>
    </>}
  </div>
}

function Group(props: {label: string, children: ReactElement[] | ReactElement}) {
  return <div className="Group">
    <h2>{props.label}</h2>
    <div className="items">
      {props.children}
    </div>
  </div>
}


function Item(props: {q: string, a: ReactElement}) {
  const [hidden, setHidden] = useState(true)
  return <div className="Item">
    <div className="header">
      <button onClick={() => setHidden(!hidden)}>{hidden ? "+" : "-"}</button>
      <div>{props.q}</div>
    </div>
    {!hidden && props.a} 
  </div>
} 


ReactDOM.render(<Faqs/>, document.querySelector("#root"))