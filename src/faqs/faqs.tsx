import { useState, ReactElement } from "react"
import { isFirefox } from "../utils/helper"
import { requestCreateTab } from "../utils/browserUtils"
import { FaMousePointer, FaPowerOff } from "react-icons/fa"
import { createRoot } from "react-dom/client"
import { Pin, Zap } from "@/comps/svgs"
import "./faqs.css"
import { IoEllipsisVertical } from "react-icons/io5"

function Faqs(props: {}) {
	return (
		<div className="Faqs">
			<Group label="privacy">
				<Item
					q={"Do you collect any data?"}
					a={
						<div>
							No, you can read the privacy policy <a href={"https://github.com/polywock/globalSpeed/blob/master/PRIVACY_POLICY.md"}>here</a>.
							In short, Global Speed does not collect any data, nor does it send any data to any remote servers.
						</div>
					}
				/>
				<Item
					q={"Why do you need permissions for all sites? "}
					a={
						<div>
							It's called <i>Global</i> Speed for a reason. It's supposed to work on all websites. You can right click the extension icon to
							restrict the Site Access to particular websites.
						</div>
					}
				/>
			</Group>
			<Group label="general">
				{!isFirefox() && (
					<>
						<Item
							q={"Can I use it with local files or in incognito mode? "}
							a={
								<div>
									Yes, but you'll need to explicitly enable it in{" "}
									<a
										href={`chrome://extensions/?id=${chrome.runtime.id}`}
										onContextMenu={(e) => e.preventDefault()}
										onMouseDown={(e) => {
											e.preventDefault()
											requestCreateTab(`chrome://extensions/?id=${chrome.runtime.id}`)
										}}
									>
										extension page
									</a>
									.
								</div>
							}
						/>
					</>
				)}
				{isFirefox() && (
					<>
						<Item
							q={"Can I use it in private mode? "}
							a={
								<div>
									Yes, but you'll need to enable it in the addon manager page, which can be accessed by going to the following URL.{" "}
									<code>about:addons</code>.
								</div>
							}
						/>
						<Item
							q={"Why doesn't the Firefox version support audio FX and browser shortcut keys? "}
							a={<div>Firefox doesn't support the required APIs. </div>}
						/>
					</>
				)}
				<Item
					q={"Why are my colors weird/inverted? "}
					a={
						<div>
							You might have enabled a filter. You can disable filters by opening the FX <Zap color={"#02a"} size={"1.428rem"} /> section.{" "}
						</div>
					}
				/>
				<Item
					q={"I got a different problem. "}
					a={
						<div>
							Try reinstalling the extension. If that doesn't fix it, create an{" "}
							<a href="https://github.com/polywock/globalSpeed/issues">issue on the Github page.</a>
						</div>
					}
				/>
			</Group>
			<Group label="speed control">
				<Item
					q={"Why doesn't it work for certain videos? "}
					a={
						<div>
							Global Speed doesn't support flash or canvas videos, only HTML5 video/audio. Some websites listen to speed change events and
							revert the speed. Or they aggressively set the speed. To bypass this, try enabling <i>ghost mode</i> in the options page.
						</div>
					}
				/>
				<Item
					q={"Why can't I change speed using the website's controls? "}
					a={
						<div>
							When using the website's own controls, Global Speed cannot determine if the user was the one that actually changed the speed. To
							workaround this, you can disable Global Speed, or using one of Global Speed's many ways to set the speed.{" "}
						</div>
					}
				/>
				<Item
					q={"What does pinning do? "}
					a={
						<div>
							By default all tabs share the same context (speed, filters, etc). If you want a tab to have unique settings, you can{" "}
							<Pin color={"#02a"} size="1.42rem" /> pin it. Useful if you want separate speeds on different tabs. If you prefer all tabs have
							different speed values, you can enable "pin by default" in the settings page.
						</div>
					}
				/>
				<Item
					q={"How do I change speed without preserving pitch? "}
					a={
						<div>
							You can enable "speed changes pitch" in the settings page, create a shortcut to toggle it, or by enabling the speed slider.
						</div>
					}
				/>
				{!isFirefox() && (
					<Item
						q={"How do I configure the speed presets?"}
						a={<div>Right click on any speed preset to change the value. You can also change them through the options page.</div>}
					/>
				)}
			</Group>
			<Group label="shortcuts">
				<Item
					q={"How do I block hotkeys on some sites? "}
					a={
						<ul>
							<li>
								In this example, I'll block hotkeys for <code>geforcenow.com</code>, a game streaming website.
							</li>
							<li>
								1. Go to <code>geforcenow.com</code>.
							</li>
							<li>2. Open the Global Speed popup menu.</li>
							<li>
								3. Near the power-off button <FaPowerOff color={"#02a"} size="1.21rem" />, click on the 3 vertical dots{" "}
								<IoEllipsisVertical style={{ verticalAlign: "middle" }} size="1.2em" /> to show more options.
							</li>
							<li>
								4. It should show an option to disable shortcuts for <code>geforcenow.com</code>.
							</li>
						</ul>
					}
				/>
				<Item
					q={"I can't type because the Global Speed hotkeys are being triggered."}
					a={
						<>
							<ol>
								<li>
									Suspend Global Speed using the <FaPowerOff color={"#02a"} size="1.21rem" /> button.
								</li>
								<li>
									For a permenant solution, while on the website, open Global Speed, click the 3 dots menu, and disable shortcuts for that
									website
								</li>
							</ol>
						</>
					}
				/>
				<Item
					q={"Why do hotkeys display incorrectly for my keyboard layout? "}
					a={
						<div>
							Global Speed uses a QWERTY input by default. If using a non-QWERTY keyboard, you change the keyboard input type to virtual in the
							options page. The option is hidden under the 3 dots. <code>[...]</code>
						</div>
					}
				/>
				<Item
					q={"Why do hotkeys not work for me? "}
					a={
						<div>
							Global Speed uses a QWERTY input by default, which causes issues with some virtual keyboards. You can try changing the keyboard
							input type to virtual in the options page. The option is hidden under the 3 dots. <code>[...]</code>
						</div>
					}
				/>
			</Group>
			<Group label="media shortcuts">
				<Item
					q={"Why are the media shortcut keys applying to the wrong video/audio? "}
					a={
						<div>
							If there multiple media elements on the page, Global Speed prioritizes videos most centered on the screen. If it's wrong, you can
							select {<FaMousePointer size={"1.428rem"} color={"#02a"} />} the video/audio you want prioritized.
						</div>
					}
				/>
				<Item
					q={"How do I control background music/video while using another tab? "}
					a={<div>Select the video/audio you want to control using the {<FaMousePointer size={"1.428rem"} color={"#02a"} />} button.</div>}
				/>
				{!isFirefox() && (
					<Item
						q={"How do I control background music or PiP videos while using another program? "}
						a={
							<div>
								Create global hotkeys in the settings page, and select the video/audio you want to control using the{" "}
								{<FaMousePointer size={"1.428rem"} color={"#02a"} />} button.{" "}
								<a href="https://www.youtube.com/watch?v=EZA-TnVAyDo">Youtube demo.</a>
							</div>
						}
					/>
				)}
				<Item
					q={"What does the simple option do for the fullscreen hotkey?"}
					a={
						<div>
							<p>
								<b>Simple mode:</b> enters fullscreen mode directly on the video and activates the basic controls.
							</p>
							<p>
								<b>Smart mode:</b> tries to enter fullscreen mode on the container element to mimic the website's standard fullscreen
								behavior. This method requires learning. If you visit a new website, you must manually click on the fullscreen button at least
								once. Otherwise, Global Speed won't know which element is the video player container.
							</p>
							<div>
								<code className="yellow">Note:</code> the fullscreen hotkey is buggy on some websites.
							</div>
						</div>
					}
				/>
			</Group>
			<Group label="circle widget">
				<Item
					q={"How do I position the circle widget? "}
					a={<div>On mobile, you can long press to enter positioning mode. On desktop, right click and drag to change the position.</div>}
				/>
				<Item
					q={"Is the circle widget only for mobile?"}
					a={
						<div>
							No, it's also compatible for desktop. It's very useful if you want to change speed or seek through the video while using only a
							mouse.
							<div>
								<code className="yellow">Tip:</code> When using with a mouse, set the circle's size to be smaller.
							</div>
						</div>
					}
				/>
			</Group>
			<Group label="shortcut trigger modes">
				<Item
					q={"How do I group menu shortcuts? "}
					a={
						<div>
							You can organize by changing the menu label to <code>group :: name</code>. For example, to group a menu shortcut called{" "}
							<code>pitch</code> under a group called <code>audio</code>, you will format it like so: <code>audio :: pitch</code>{" "}
						</div>
					}
				/>
			</Group>
			{!isFirefox() && (
				<>
					<Group label="audio effects">
						<Item
							q={"What's the difference between standard and HD pitch shifter? "}
							a={
								<div>
									The standard one uses{" "}
									<a href="https://github.com/cwilso/Audio-Input-Effects/blob/master/js/jungle.js">Cwilso's Jungle algorithm.</a> The HD
									version uses <a href="https://github.com/cutterbl/SoundTouchJS">Cutterbl's port</a> of{" "}
									<a href="https://www.surina.net/soundtouch/">Soundtouch</a>. The HD one has less reverb, but also has a small delay.
								</div>
							}
						/>
						<Item
							q={"Why can't I make the video fullscreen when I use audio effects? "}
							a={
								<div>
									The API does not allow entering fullscreen if the tab's audio is already captured. You need to first enter fullscreen and
									then capture the audio using the optional "capture audio" menu or browser shortcut.
								</div>
							}
						/>
						<Item
							q={"Why don't the audio effects work well with page shortcuts? "}
							a={
								<div>
									The browser only allow extension's to modify the tab's audio if the user invokes the extension. Only browser shortcuts and
									menu shortcuts can invoke an extension. If using page shortcuts, pair it with a tab capture shortcut.
								</div>
							}
						/>
					</Group>
				</>
			)}
		</div>
	)
}

function Group(props: { label: string; children: ReactElement[] | ReactElement }) {
	return (
		<div className="Group">
			<h2>{props.label}</h2>
			<div className="items">{props.children}</div>
		</div>
	)
}

function Item(props: { q: string | ReactElement; a: ReactElement; marginTop?: boolean }) {
	const [hidden, setHidden] = useState(true)
	return (
		<div className={`Item ${props.marginTop ? "marginTop" : ""}`}>
			<div className="header" onClick={() => setHidden(!hidden)}>
				<button>{hidden ? "+" : "-"}</button>
				<div>{props.q}</div>
			</div>
			{!hidden && props.a}
		</div>
	)
}

const root = createRoot(document.querySelector("#root"))
root.render(<Faqs />)
