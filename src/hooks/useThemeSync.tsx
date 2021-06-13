import { useEffect } from "react"
import { useStateView } from "../hooks/useStateView"


export function useThemeSync() {
  const [view, setView] = useStateView({darkTheme: true})
  useEffect(() => {
    if (view?.darkTheme) {
      document.documentElement.classList.add("darkTheme")
    } else {
      document.documentElement.classList.remove("darkTheme")
    }
  }, [view?.darkTheme])
}