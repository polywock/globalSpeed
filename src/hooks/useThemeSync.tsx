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

export function useThemeSync() {
	const [view] = useStateView({ darkTheme: true, fontSize: true })
	useEffect(() => {
		const darkTheme = view?.darkTheme

		document.documentElement.style.setProperty("--font-size-scalar", `${view?.fontSize ?? (isMobile() ? 1.3 : 1)}`)

		if (darkTheme === "system") {
			const mql = window.matchMedia("(prefers-color-scheme: dark)")
			applyDarkTheme(mql.matches)

			const handler = (e: MediaQueryListEvent) => {
				applyDarkTheme(e.matches)
			}
			mql.addEventListener("change", handler)
			return () => mql.removeEventListener("change", handler)
		} else {
			applyDarkTheme(!!darkTheme)
		}
	}, [view?.darkTheme, view?.fontSize])

	if (gvar.gsm._scale) {
		document.documentElement.style.setProperty("--font-lang-scalar", `${gvar.gsm._scale}`)
	}
}
