import { useEffect } from "react"
import { isMobile } from "@/utils/helper"
import { useStateView } from "../hooks/useStateView"

function applyDarkTheme(isDark: boolean) {
	if (isDark) {
		document.documentElement.classList.add("darkTheme")
	} else {
		document.documentElement.classList.remove("darkTheme")
	}
}

const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches

export function useThemeSync() {
	const [view] = useStateView({ darkTheme: true, fontSize: true })
	useEffect(() => {
		document.documentElement.style.setProperty("--font-size-scalar", `${view?.fontSize ?? (isMobile() ? 1.3 : 1)}`)

		if (view?.darkTheme == null ? systemIsDark : view?.darkTheme) {
			document.documentElement.classList.add("darkTheme")
		} else {
			document.documentElement.classList.remove("darkTheme")
		}
	}, [view?.darkTheme, view?.fontSize])

	if (gvar.gsm._scale) {
		document.documentElement.style.setProperty("--font-lang-scalar", `${gvar.gsm._scale}`)
	}
}
