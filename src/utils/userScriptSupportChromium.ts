let cachedCanUserScriptExecute: { result: boolean }

export function canPotentiallyUserScriptExecute() {
	if (cachedCanUserScriptExecute) return cachedCanUserScriptExecute.result

	try {
		cachedCanUserScriptExecute = {
			result: (navigator as any).userAgentData.brands.some((v: any) => v.brand === "Chromium" && parseInt(v.version) >= 136),
		}
	} catch {
		cachedCanUserScriptExecute = { result: false }
	}
	return cachedCanUserScriptExecute.result
}

export function canUserScript() {
	try {
		if (chrome.userScripts.getScripts()) return true
	} catch {
		return false
	}
	return null
}
