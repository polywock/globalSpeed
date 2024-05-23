import { useState, useEffect, useCallback, useMemo } from "react"
import { StateView, StateViewSelector } from "../types"
import { SubscribeView } from "../utils/state"

type Env = {
  client?: SubscribeView
}

export function useStateView(selector: StateViewSelector | (keyof StateView)[], wait?: number, maxWait?: number): [StateView, SetView] {
  const [view, _setView] = useState(null as StateView)
  const env = useMemo(() => ({} as Env), [])

  useEffect(() => {
    env.client = new SubscribeView(selector, gvar.tabInfo?.tabId, true, _setView, wait, maxWait)

    return () => {
      env.client.release()
      delete env.client
    }
  }, [])

  let setView = useCallback((view: StateView) => {
    env.client?.push(view)
  }, [])

  return [view, setView] 
}


export type SetView = (view: StateView) => void