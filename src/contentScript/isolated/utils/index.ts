import { isFirefox } from "@/utils/helper"
import { getLeaf } from "@/utils/nativeUtils"

export function documentHasFocus() {
	return document.hasFocus() && !(getLeaf(document, "activeElement")?.tagName === "IFRAME")
}

export function injectScript(text: string) {
	if (!(isFirefox() && text)) return
	const script = document.createElement("script")
	script.type = "text/javascript"
	script.text = text
	document.documentElement.appendChild(script)
	script.remove()
}
