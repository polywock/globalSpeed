
import { useState, useEffect, useMemo } from "react"
import { FlatMediaInfo, flattenMediaInfos } from "../contentScript/utils/genMediaInfo"

type Env = {
  shownBefore: string[]
}

export function useMediaWatch(): FlatMediaInfo[] {
  const [flats, setFlats] = useState([] as FlatMediaInfo[])
  const env = useMemo<Env>(() => ({shownBefore: []}), [])

  useEffect(() => {
    const port = chrome.runtime.connect({name: "MEDIA_WATCH"})
    port.onMessage.addListener(msg => {

      let infos = flattenMediaInfos(msg.scopes, msg.pinInfo).filter(info => {
        const sameTab = window.tabInfo.tabId === info.tabInfo.tabId
        if (info.pinned || env.shownBefore.includes(info.key) || (info.readyState && (sameTab || !info.paused))) {
          env.shownBefore.push(info.key)
          return true 
        }
      })

      setFlats(infos)
    })

    return () => {
      port.disconnect()
    }
  }, [])

  // return mediaInfos 
  return flats
}
