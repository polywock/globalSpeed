import { canUserScript } from "@/utils/userScriptSupportChromium"

// Chromium runs the rule's JS through the userScripts API, which needs the user to have
// allowed user scripts for the extension — canUserScript reports whether they did.
// Awaiting inside the try keeps both a synchronous throw and a rejection contained.
export async function runUserJs(tabId: number, code: string) {
	if (!canUserScript()) return
	try {
		await chrome.userScripts.execute({
			injectImmediately: true,
			js: [{ code }],
			world: "MAIN",
			target: { tabId, frameIds: [0] },
		})
	} catch {}
}
