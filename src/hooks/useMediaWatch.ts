
import { useState, useEffect, useMemo } from "react"
import { FlatMediaInfo, flattenMediaInfos } from "../contentScript/utils/genMediaInfo"

type Env = {
  shownBefore: string[]
}

type WatchInfo = {infos: FlatMediaInfo[], pinned: string}

export function useMediaWatch(): WatchInfo {
  const [watchInfo, setWatchInfo] = useState(null as WatchInfo)
  const env = useMemo<Env>(() => ({shownBefore: []}), [])

  useEffect(() => {
    const port = chrome.runtime.connect({name: "MEDIA_WATCH"})
    port.onMessage.addListener(msg => {

      let infos = flattenMediaInfos(msg.scopes).filter(info => {
        const sameTab = gvar.tabInfo.tabId === info.tabInfo.tabId
        if (info.readyState && (info.key === msg.pinned || env.shownBefore.includes(info.key) || sameTab || !info.paused)) {
          env.shownBefore.push(info.key)
          return true 
        }
      })

      setWatchInfo({infos, pinned: msg.pinned})
    })

    return () => {
      port.disconnect()
    }
  }, [])

  return watchInfo
}
