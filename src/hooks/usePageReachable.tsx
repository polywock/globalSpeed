import { createContext, ReactNode, useContext, useEffect, useState } from "react"
import { gvar } from "@/globalVar"
import { checkContentScript } from "@/utils/browserUtils"

/** False without a provider, so anything rendered outside the popup simply opts out. */
const PageReachableContext = createContext(false)

/**
 * Whether the active tab's top frame answered when the popup opened. Controls that reach
 * into the page, like putting a slider on it, are only offered when it did.
 */
export function PageReachableProvider(props: { children: ReactNode }) {
	const [reachable, setReachable] = useState(false)

	// Asked once at launch. A page that answers now is one we can send to.
	useEffect(() => {
		if (!gvar.tabInfo?.tabId) return
		checkContentScript(gvar.tabInfo.tabId, 0).then(
			(alive) => setReachable(!!alive),
			() => {},
		)
	}, [])

	return <PageReachableContext value={reachable}>{props.children}</PageReachableContext>
}

export function usePageReachable() {
	return useContext(PageReachableContext)
}
