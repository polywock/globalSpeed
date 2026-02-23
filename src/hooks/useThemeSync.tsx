import { useEffect } from "react"
import { useStateView } from "../hooks/useStateView"
import { isMobile } from "@/utils/helper"

export function useThemeSync() {
	const [view] = useStateView({ darkTheme: true, fontSize: true })
	useEffect(() => {
		if (view?.darkTheme) {
			document.documentElement.classList.add("darkTheme")
		} else {
			document.documentElement.classList.remove("darkTheme")
		}

		document.documentElement.style.setProperty("--font-size-scalar", `${view?.fontSize ?? (isMobile() ? 1.3 : 1)}`)
	}, [view?.darkTheme, view?.fontSize])

	if (gvar.gsm._scale) {
		document.documentElement.style.setProperty("--font-lang-scalar", `${gvar.gsm._scale}`)
	}
}
