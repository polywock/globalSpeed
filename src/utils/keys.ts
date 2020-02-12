
export type FullHotKey = {
  code: string,
  altKey?: boolean,
  ctrlKey?: boolean,
  shiftKey?: boolean,
  metaKey?: boolean
}

export type Hotkey = FullHotKey | string

export function formatHotkey(key: Hotkey) {
  if (!key) {
    return "NoKey"
  }
  if (typeof(key) === "string") {
    return key 
  } else {
    let parts: string[] = []
    if (key.ctrlKey) {
      parts.push(`⌃`)
    }
    if (key.altKey) {
      parts.push(`⌥`)
    }
    if (key.shiftKey) {
      parts.push(`⇧`)
    }
    if (key.metaKey) {
      parts.push(`⌘`)
    }
    parts.push(key.code)
    return parts.join(" ")
  }
}

export function extractHotkey(event: KeyboardEvent): FullHotKey {
  return {
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    code: event.code
  }
}

export function compareHotkeys(lhs: Hotkey, rhs: Hotkey) {
  if (lhs == null || rhs == null) {
    return false 
  }
  if (typeof(lhs) === "string") {
    lhs = {code: lhs} as FullHotKey
  }
  if (typeof(rhs) === "string") {
    rhs = {code: rhs} as FullHotKey
  }

  return (lhs.ctrlKey === true) == (rhs.ctrlKey === true) && 
        (lhs.altKey === true) == (rhs.altKey === true) && 
        (lhs.shiftKey === true) == (rhs.shiftKey === true) && 
        (lhs.metaKey === true) == (rhs.metaKey === true) && 
        lhs.code === rhs.code
}