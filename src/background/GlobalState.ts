import { Context, Pin, StateView, StateViewSelector, State } from "../types";
import { MessageCallback } from "../utils/browserUtils";
import { randomId } from "../utils/helper";
import { getDefaultState } from "../defaults";
import cloneDeep from "lodash.clonedeep";
import debounce from "lodash.debounce";
import { sendMediaEvent } from "../utils/configUtils";
import { migrateGrainData } from "../utils/migrateSchema";


export class GlobalState {
  subs: Set<SubInfo> = new Set()
  pins: Pin[] = []
  frozen: Map<string, Set<SubInfo>> = new Map()
  constructor(public state: State) {
    chrome.runtime.onMessage.addListener(this.handleMessage)
    chrome.runtime.onConnect.addListener(this.handlePortConnect)
    chrome.runtime.onSuspend?.addListener(() => {
      this.persistThrottled.flush()
    })
  }
  reload = (state: State) => {
    try {
      let newState = migrateGrainData(state) 
      if (newState.version === getDefaultState().version) {
        this.state = newState 
        this.pins = []

        // notify
        this.subs.forEach(sub => {
          sub.handleUpdate(this.get(sub.selector, sub.tabId))
        })
      }
    } catch (err) {
      return false 
    } 

    return true 
  }
  get = (keys: StateViewSelector, tabId?: number) => {
    const out: StateView = {} 

    for (let _key in keys) {
      const key = _key as keyof StateView

      if (key === "isPinned" || namedSelectors.ctx[key]) {
        const pin = this.pins?.find(pin => pin.tabId === tabId)
        const ctx = pin?.ctx || this.state.common

        if (key === 'isPinned') {
          out["isPinned"] = !!pin
        } else {
          (out as any)[key] = ctx[key as keyof Context]
        }
      } 

      if (namedSelectors.simple[key]) {
        (out as any)[key] = this.state[key as keyof State]
        continue 
      }
    }

    // If super disabled, set .enabled to false. 
    if (keys.enabled) {
      const { superDisable } = this.get({superDisable: true})
      if (superDisable) {
        out.enabled = false 
      }
    }

    return out 
  }

  _set = (override: StateView, tabId: number, overDefault?: boolean) => {

    if (overDefault) {
      this.state = getDefaultState()
    }

    const flags: ChangeFlags = {
      real: new Set(),
      ctx: Object.fromEntries(Object.keys(namedSelectors.ctx).map(key => [key, {current: false, common: false}])) as any,
      isPinnedCurrent: false 
    }

    // main loop that iterates over every key
    let ctxKeys = [] as (keyof StateView)[]
    for (let _key in override) {
      const key = _key as keyof StateView

      // isPinned we check independently
      if (key === "isPinned") {
        continue 
      } 

      // if a ctx key, collect it. 
      if (namedSelectors.ctx[key]) {
        ctxKeys.push(key)
        continue 
      } 

      // if real, set it.
      if (namedSelectors.simple[key]) {
        const newValue = override[key];
        if (newValue !== (this.state as any)[key]) {
          (this.state as any)[key] = newValue 
          flags.real.add(key)
        }
        continue 
      }

    }

    // define closure to lazy load ctx.
    let loaded: {pin: Pin, ctx: Context};

    const lazyInit = (force?: boolean) => {
      if (!force && loaded) return 

      const pin = this.pins?.find(pin => pin.tabId === tabId)
      loaded = {
        pin,
        ctx: pin?.ctx || this.state.common
      }
    }

    // handle isPinned next.
    if ("isPinned" in override && tabId != null) { 
      lazyInit()

      // if we add pin.
      if (override.isPinned && !loaded.pin) {
        flags.isPinnedCurrent = true 
        
        this.pins = this.pins || []
        this.pins.push({
          tabId,
          ctx: cloneDeep(this.state.common)
        })
        lazyInit(true)
      }

      // if we remove pin
      if (!override.isPinned && loaded.pin) { 
        flags.isPinnedCurrent = true 
        
        this.pins = (this.pins || []).filter(v => v.tabId !== tabId)
        lazyInit(true)
      } 
    }

    // finally ctx keys 
    for (let key of ctxKeys) {
      lazyInit();
      if ((loaded.ctx as any)[key] !== override[key]) {
        (loaded.ctx as any)[key] = override[key]
        flags.ctx[key][loaded.pin ? "current" : "common"] = true 
      }
    }

    this.persistThrottled()

    return flags
  }
  set = (_init: SetInit[] | SetInit, frozenId?: string) => {
    const inits = Array.isArray(_init) ? _init : [_init]
    let speedOrFreePitch = false 

    const markedSubs = new Set<SubInfo>()
    for (let init of inits) {
      const {override, tabId, ignoreSub, overDefault} = init

      const flags = this._set(override, tabId, overDefault)

      if (flags.ctx.speed.common || flags.real.has("freePitch")) {
        speedOrFreePitch = true 
      } 

      // go through each sub 
      for (let sub of this.subs) {
        if (ignoreSub && sub.id === ignoreSub) {
          continue
        }
        const isPinned = !!(this.pins || []).find(v => v.tabId === sub.tabId)

        if (overDefault || checkSubUpdate(sub, isPinned, tabId, flags)) {
          markedSubs.add(sub)
        }
      }
    }

    // notify 
    if (frozenId) {
      const current = this.frozen.get(frozenId) || new Set()
      markedSubs.forEach(sub => current.add(sub))
      this.frozen.set(frozenId, current)
    } else {
      markedSubs.forEach(sub => {
        sub.handleUpdate(this.get(sub.selector, sub.tabId))
      })
    }

    // make sure background tabs are updated
    if (speedOrFreePitch) {
      window.globalMedia.scopes.forEach(scope => {
        const view = this.get({enabled: true, speed: true, isPinned: true, freePitch: true})
        if (!view.enabled || view.isPinned) return 
        scope.media?.forEach(media => {
          if (media.readyState && !media.paused) {
            sendMediaEvent({type: "PLAYBACK_RATE", value: view.speed ?? 1, freePitch: view.freePitch}, media.key, scope.tabInfo.tabId, scope.tabInfo.frameId)
          }
        })
      })
    }
  }
  unfreeze = (id: string) => {
    this.frozen.get(id)?.forEach(sub => {
      sub.handleUpdate(this.get(sub.selector, sub.tabId))
    })
    this.frozen.delete(id)
  }
  persist = () => {
    chrome.storage.local.set({
      config: this.state
    })
  }
  persistThrottled = debounce(this.persist, 5000, {trailing: true, maxWait: 15000})
  handlePortConnect = (port: chrome.runtime.Port) => {
    if (port.name.startsWith("subscribe ")) {
      const { selector, tabId, wait, maxWait, id } = JSON.parse(port.name.slice(10))
      const sub: SubInfo = {
        selector,
        tabId,
        handleUpdate: debounce(data => {
          port.postMessage(data)
        }, wait ?? 0, {leading: true, trailing: true, ...(maxWait == null ? {} : {maxWait})}),
        id
      }

      this.subs.add(sub)

      port.onDisconnect.addListener(port => {
        this.subs.delete(sub)
      })
    }
  }
  handleMessage: MessageCallback = (msg, sender, reply) => {
    if (msg.type === "PUSH_VIEW") {
      this.set(msg.init as SetInit)
      reply(true)
    } else if (msg.type === "FETCH_VIEW") {
      reply(this.get(msg.selector as StateViewSelector, msg.tabId))
    } else if (msg.type === "GET_STATE") {
      reply(this.state)
    } else if (msg.type === "RELOAD_STATE") {
      reply(this.reload(msg.state))
    }
  }
}

const namedSelectors = {
    ctx: {
      speed: true, 
      lastSpeed: true,
      enabled: true,
      elementFx: true,
      backdropFx: true,
      audioFx: true,
      audioFxAlt: true,
      stereoControl: true,
      monoOutput: true
    } as StateViewSelector,
    simple: {
      version: true,
      language: true,
      pinByDefault: true,
      hideIndicator: true,
      feedbackVolume: true,
      hideBadge: true,
      staticOverlay: true,
      hideMediaView: true,
      darkTheme: true,
      keybinds: true,
      keybindsUrlCondition: true,
      rules: true,
      ghostMode: true,
      indicatorInit: true,
      freePitch: true,
      superDisable: true
    } as StateViewSelector    
}

function pruneSelectors(selector: StateViewSelector) {
  return Object.fromEntries(Object.entries(selector).filter(([k, v]) => v)) as StateViewSelector
}

function checkSubUpdate(sub: SubInfo, subTabIsPinned: boolean, tabId: number, flags: ChangeFlags) {
  const sameTab = sub.tabId === tabId || sub.tabId === -1


  // .superDisable can change .enabled (derived) value. 
  if (sub.selector.enabled && flags.real.has("superDisable")) {
    return true 
  }

  for (let _key in sub.selector) {
    const key = _key as keyof StateView
    if (key === "isPinned") {

      // Either pins was set or isPinned was changed on the same tab.
      if (sameTab && flags.isPinnedCurrent) {
        return true 
      }
    } else if (namedSelectors.ctx[key]) {

      if (sameTab && flags.isPinnedCurrent) {
        return true 
      }
      
      if (subTabIsPinned || sub.tabId === -1) {
        if (flags.ctx[key].current && sameTab) {
          return true 
        }
      } 
      
      if (!subTabIsPinned || sub.tabId === -1) {
        if (flags.ctx[key].common) {
          return true 
        }
      }
    } else {
      if (flags.real.has(key)) {
        return true
      }
    }
  }
}

export function fetchView(selector: StateViewSelector, tabId?: number): Promise<StateView> {
  if (window.globalState) {
    return Promise.resolve(window.globalState.get(selector, tabId))
  }

  return new Promise((res, rej) => {
    if (window.globalState) {
      res(window.globalState.get(selector, tabId))
    } else {
      chrome.runtime.sendMessage({type: "FETCH_VIEW", selector, tabId}, view => {
        if (chrome.runtime.lastError) {
          rej(chrome.runtime.lastError)
          return 
        }
        res(view)
      })
    }
  })
}

export function pushView(init: SetInit): Promise<void> {
  if (window.globalState) {
    window.globalState.set(init)
    return Promise.resolve()
  }

  return new Promise((res, rej) => {

    // sendMessage removes undefined values, so ensure they are null.
    const override: StateView = {}
    for (let [key, value] of Object.entries(init.override || {})) {
      (override as any)[key] = value ?? null
    }
    init.override = override

    chrome.runtime.sendMessage({type: "PUSH_VIEW", init}, v => {
      if (chrome.runtime.lastError) {
        rej(chrome.runtime.lastError)
      } else {
        res()
      }
    })
  })
}

export function subscribeView(selector: StateViewSelector, tabId?: number, onLaunch?: boolean, cb?: (view: StateView, launch: boolean) => void, wait?: number, maxWait?: number): SubClient  {
  selector = pruneSelectors(selector)
  const client = {
    cbs: cb ? new Set([cb]) : new Set(),
    subId: randomId()
  } as SubClient

  const handleUpdate = (view: StateView, launch?: boolean) => {
    client.view = view 
    client.cbs.forEach(cb => {
      cb(view, launch)
    })
  }

  if (window.globalState) {
    const handleUpdateDeb = debounce(handleUpdate, wait ?? 0, {trailing: true, leading: true, ...(maxWait == null ? {} : {maxWait})})
    const subInfo = {selector, tabId, handleUpdate: handleUpdateDeb, id: client.subId} as SubInfo
    window.globalState.subs.add(subInfo)
    client.release = () => {
      if (!client.released) {
        client.released = true 
        client.cbs.clear()
        window.globalState.subs.delete(subInfo)
      }
      
    }
  } else {
    const port = chrome.runtime.connect({
      name: `subscribe ${JSON.stringify({selector, tabId, id: client.subId, wait, maxWait})}`
    })
  
  
    port.onMessage.addListener(msg => {
      handleUpdate(msg)
    })
  
    client.release = () => {
      if (!client.released) {
        client.released = true 
        client.cbs.clear()
        port.disconnect()
      }
    }
  }

  client.push = _view => {
    const override = {} as StateView
    Object.keys(selector).forEach(key => {
      (override as any)[key] = (_view as any)[key]
    })
    handleUpdate(override, false)
    pushView({override, tabId, ignoreSub: client.subId})
  }

  onLaunch && fetchView(selector, tabId).then(view => {
    handleUpdate(view, true)
  })

  return client 
}

type SubInfo = {
  selector: StateViewSelector, 
  handleUpdate: (data: StateView) => void, 
  tabId?: number,
  id: string
}

type ChangeFlags = {
  real: Set<keyof StateView>,
  ctx: {[key in keyof StateView]: {current: boolean, common: boolean}}, 
  isPinnedCurrent: boolean 
}


export type SubClient = {
  cbs: Set<(view: StateView, first?: boolean) => void>,
  release?: () => void,
  released?: boolean,
  view?: StateView,
  push?: (view: StateView) => void,
  subId: string
}

export type SetInit = {
  override: StateView, 
  tabId?: number, 
  ignoreSub?: string, 
  overDefault?: boolean
}