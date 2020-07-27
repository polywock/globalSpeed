import { useState, useEffect, useCallback, useMemo } from "react"
import { StateView, StateViewSelector } from "../types"
import { subscribeView } from "../background/GlobalState"

type Env = {
  client?: ReturnType<typeof subscribeView>
}

export function useStateView(selector: StateViewSelector, wait?: number, maxWait?: number): [StateView, SetView] {
  const [view, _setView] = useState(null as StateView)
  const env = useMemo(() => ({} as Env), [])

  useEffect(() => {
    env.client = subscribeView(selector, window.tabInfo?.tabId, true, view => {
      _setView(view)
    }, wait, maxWait)

    return () => {
      env.client.release()
    }
  }, [])

  let setView = useCallback((view: StateView) => {
    env.client.push(view)
  }, [])

  return [view, setView] 
}


export type SetView = (view: StateView) => void