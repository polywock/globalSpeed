// Firefox has neither the offscreen nor the tabCapture API, so audio FX is unavailable.
// Every consumer already gates on SUPPORTS_TAB_CAPTURE or on the capture status these
// stubs report, so they exist purely to keep the imports resolvable.

export const SUPPORTS_TAB_CAPTURE = false

export async function hasOffscreen(): Promise<boolean> {
	return false
}

export async function ensureOffscreen() {}

export async function initTabCapture(tabId: number): Promise<boolean> {
	return false
}

export async function releaseTabCapture(tabId: number) {}

export async function isTabCaptured(tabId?: number): Promise<boolean> {
	return false
}

export async function connectReversePort(tabId: number): Promise<chrome.runtime.Port> {
	return null
}
