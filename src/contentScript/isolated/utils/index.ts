import { IS_FIREFOX_BUILD } from "@/utils/buildFlags"
import { getLeaf } from "@/utils/nativeUtils"

export function documentHasFocus() {
	return document.hasFocus() && !(getLeaf(document, "activeElement")?.tagName === "IFRAME")
}

export function injectScript(text: string) {
	if (!(IS_FIREFOX_BUILD && text)) return
	const script = document.createElement("script")
	script.type = "text/javascript"
	script.text = text
	document.documentElement.appendChild(script)
	script.remove()
}
