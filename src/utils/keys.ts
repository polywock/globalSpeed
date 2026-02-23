
export type FullHotkey = {
  code?: string,
  altKey?: boolean,
  ctrlKey?: boolean,
  shiftKey?: boolean,
  metaKey?: boolean,
  key?: string
}

export type Hotkey = FullHotkey | string

export function formatHotkey(hot: Hotkey) {
  if (!hot) {
    return gvar.gsm?.token.none || "None"
  }
  if (typeof(hot) === "string") {
    return hot 
  } else {
    let parts: string[] = []
    if (hot.ctrlKey) {
      parts.push(`⌃`)
    }
    if (hot.altKey) {
      parts.push(`⌥`)
    }
    if (hot.shiftKey) {
      parts.push(`⇧`)
    }
    if (hot.metaKey) {
      parts.push(`⌘`)
    }
    let visualKey = hot.key
    if (visualKey) {
      if (visualKey.length === 1) visualKey = visualKey.toLocaleUpperCase()
      if (visualKey.trim() === "") visualKey = "Space"
    }

    parts.push(hot.key ? visualKey : hot.code)
    return parts.join(" ")
  }
}

export function extractHotkey(event: KeyboardEvent, physical = true, virtual?: boolean): FullHotkey {
  return {
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    code: physical ? event.code : undefined,
    key: virtual ? event.key : undefined
  }
}

export function compareHotkeys(lhs: Hotkey, rhs: Hotkey) {
  if (lhs == null || rhs == null) {
    return false 
  }
  if (typeof(lhs) === "string") {
    lhs = {code: lhs} as FullHotkey
  }
  if (typeof(rhs) === "string") {
    rhs = {code: rhs} as FullHotkey
  }

  const pre = 
    (lhs.ctrlKey === true) == (rhs.ctrlKey === true) && 
    (lhs.altKey === true) == (rhs.altKey === true) && 
    (lhs.shiftKey === true) == (rhs.shiftKey === true) && 
    (lhs.metaKey === true) == (rhs.metaKey === true)

  if (!pre) return false 


  if (lhs.key && rhs.key && lhs.key === rhs.key) return true 
  if (lhs.code && rhs.code && lhs.code === rhs.code) return true 
}