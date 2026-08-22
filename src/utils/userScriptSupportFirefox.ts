// Firefox never routes user JS through the userScripts API — the isolated content script
// relays it instead (see runUserJsFirefox), so nothing here is ever reachable. Keeping the
// probe out of the Firefox bundle is what lets strict_min_version sit below 136.

export function canPotentiallyUserScriptExecute() {
	return false
}

export function canUserScript(): boolean {
	return false
}
