import { ReactNode, useRef, useState } from "react"
import { AdjustMode, CommandGroup, Keybind, StateView, Trigger } from "../types"
import { areYouSure, isFirefox, isMobile, moveItem, randomId } from "../utils/helper"
import { commandInfos, CommandName, getDefaultPageKeybinds, getDefaultMenuKeybinds, availableCommandNames } from "../defaults/commands"
import { KeybindControl } from "./keybindControl"
import { CommandWarning } from "./CommandWarning"
import { SetView, useStateView } from "../hooks/useStateView"
import { produce } from "immer"
import { URLModal } from "./URLModal"
import { getDefaultURLCondition } from "../defaults"
import { getSelectedParts, requestSyncContextMenu } from "@/utils/configUtils"
import { ListItem } from "./ListItem"
import { List } from "./List"
import "./SectionEditor.css"
import { DevWarning, DevWarningType, useDevWarningType } from "./DevWarning"

type ListKey = "pageKeybinds" | "browserKeybinds" | "menuKeybinds"

export function SectionEditor(props: {}) {
  const [view, setView] = useStateView({pageKeybinds: true, browserKeybinds: true, menuKeybinds: true, keybindsUrlCondition: true, hideIndicator: true, virtualInput: true, freshKeybinds: true})
  const allKeybinds = view ? [...(view.pageKeybinds || []), ...(view.browserKeybinds || []), ...(view.menuKeybinds || [])] : []
  const devWarningType = useDevWarningType(allKeybinds.some(kb => kb.enabled && kb.command === "runCode"))
  
  if (!view) return <div></div>

  if (view.freshKeybinds) {
    handleFreshKeybinds(view, setView)
    return <div></div>
  }

  return (
    <>
      <KeybindSection 
        listKey="pageKeybinds" 
        view={view} 
        setView={setView} 
        showUrlConditions 
        devWarningType={devWarningType} 
      />


      {(isFirefox() || isMobile()) ? null : (
        <KeybindSection 
          listKey="browserKeybinds" 
          view={view} 
          setView={setView} 
          showUrlConditions 
          devWarningType={devWarningType}
        />
      )}

      {isMobile() ? null : (
        <KeybindSection 
          listKey="menuKeybinds" 
          view={view} 
          setView={setView} 
          devWarningType={devWarningType} 
        />
      )}
    </>
  )
}

const SECTION_TRIGGER: Record<ListKey, Trigger> = {
  pageKeybinds: Trigger.PAGE,
  browserKeybinds: Trigger.BROWSER,
  menuKeybinds: Trigger.MENU
}

function getSectionTitle(listKey: ListKey): string {
  const titles: Record<ListKey, string> = {
    pageKeybinds: gvar.gsm.options.editor.pageShortcuts,
    browserKeybinds: gvar.gsm.options.editor.browserShortcuts,
    menuKeybinds: gvar.gsm.options.editor.menuShortcuts
  }
  return titles[listKey]
}

function getSectionSubheader(listKey: ListKey): string {
  const subs: Record<ListKey, string> = {
    pageKeybinds: (gvar.gsm.options.editor as any).pageShortcutsSub,
    browserKeybinds: gvar.gsm.options.editor.browserShortcutsSub,
    menuKeybinds: gvar.gsm.options.editor.menuShortcutsSub
  }
  return subs[listKey]
}

const SECTION_DEFAULTS: Record<ListKey, () => Keybind[]> = {
  pageKeybinds: getDefaultPageKeybinds,
  browserKeybinds: () => [],
  menuKeybinds: getDefaultMenuKeybinds
}

function KeybindSection(props: {listKey: ListKey, view: StateView, setView: SetView, showUrlConditions?: boolean, devWarningType?: DevWarningType}) {
  const { listKey, view, setView, showUrlConditions, devWarningType} = props
  const listRef = useRef<HTMLDivElement>(null)
  const keybinds = view[listKey] || []
  const hasJs = keybinds.some(kb => kb.enabled && kb.command === "runCode")

  return (
    <div className="section SectionEditor">
      <h2>{getSectionTitle(listKey)}</h2>
      {!!getSectionSubheader(listKey) && <div className="subheader">{getSectionSubheader(listKey)}</div>}
      {devWarningType ? <DevWarning warningType={hasJs ? devWarningType : DevWarningType.NONE} /> : null}
      {listKey === "browserKeybinds" && <CommandWarning keybinds={view[listKey] || []} />}

      <List listRef={listRef} spacingChange={idx => onSpacingChange(setView, view, listKey, idx)}>
        {keybinds.map((kb, i) => (
          <ListItem key={kb.id} isEnabled={kb.enabled} label={kb.label} spacing={kb.spacing} listRef={listRef} onMove={newIndex => onMove(setView, view, listKey, kb.id, newIndex)} onRemove={() => onRemove(setView, view, listKey, kb.id)} onClearLabel={() => {
            onChange(setView, view, listKey, kb.id, produce(kb, d => {
              delete d.label
            }))
          }}>
            <KeybindControl virtualInput={view.virtualInput} isLast={i === (keybinds.length - 1)} listRef={listRef} hideIndicator={view.hideIndicator} key={kb.id} value={kb} 
              onChange={(id, newValue) => onChange(setView, view, listKey, id, newValue)} 
              onRemove={id => onRemove(setView, view, listKey, id)}
              onMove={(id, newIndex) => onMove(setView, view, listKey, id, newIndex)}
              onDuplicate={id => onDuplicate(setView, view, listKey, id)}
            />
          </ListItem>
        ))}
      </List>
      <SectionControls listKey={listKey} view={view} setView={setView} showUrlConditions={showUrlConditions} />
    </div>
  )
}


function onSpacingChange(setView: SetView, view: StateView, listKey: ListKey, idx: number) {
  const kb = view[listKey][idx]
  if (!kb) return 
  onChange(setView, view, listKey, kb.id, produce(kb, d => {
    d.spacing = ((d.spacing || 0) + 1) % 3
  }))
}

function onRemove(setView: SetView, view: StateView, listKey: ListKey, id: string) {
  setView({
    [listKey]: view[listKey].filter(v => v.id !== id)
  })
  if (listKey === "menuKeybinds") requestSyncContextMenu()
}


function onChange(setView: SetView, view: StateView, listKey: ListKey, id: string, newKb: Keybind) {
  setView({
    [listKey]: produce(view[listKey], d => {
      const idx = d.findIndex(v => v.id === id)
      d[idx] = newKb
    })
  })
}

function onDuplicate(setView: SetView, view: StateView, listKey: ListKey, id: string) {
  setView({
    [listKey]: produce(view[listKey], d => {
      const idx = d.findIndex(kb => kb.id === id)
      if (idx < 0) return 
      const source = view[listKey][idx]
      const newKb = structuredClone(source)
      delete newKb.key
      newKb.id = randomId()
      newKb.spacing = source.spacing
      delete source.spacing
      d.splice(idx + 1, 0, newKb)
    })
  })
  if (listKey === "menuKeybinds") requestSyncContextMenu()
}

function onMove(setView: SetView, view: StateView, listKey: ListKey, id: string, newIndex: number) {
  setView({
    [listKey]: produce(view[listKey], d => {
      const oldIndex = moveItem(d, v => v.id === id, newIndex)
      
      const oldSpacing = d[oldIndex].spacing
      d[oldIndex].spacing =  d[newIndex].spacing
      d[newIndex].spacing = oldSpacing
    })
  })
  if (listKey === "menuKeybinds") requestSyncContextMenu()
}

let cachedOptions: {
  value: string;
  label: string;
  disabled?: boolean;
}[]

let cachedOptionsForPage: typeof cachedOptions

function getOptions(forPage: boolean) {
  if (forPage && cachedOptionsForPage) return cachedOptionsForPage
  if (!forPage && cachedOptions) return cachedOptions

  const cached: typeof cachedOptions = []
  let previousGroup: {group: CommandGroup}
  availableCommandNames.forEach(command => {
    const info = commandInfos[command as keyof typeof commandInfos]
    if (isMobile() && info.disableOnMobile) return 
    if (previousGroup && previousGroup.group !== info.group) {
      cached.push({label: "------", value: `${command}_group`, disabled: true})
    }
    cached.push({label: (gvar.gsm.command as any)[command], value: command})
    previousGroup = {group: info.group}
  })
  if (forPage) {
    const idx = cached.findIndex(v => v.value === "afxCapture")
    if (idx >= 0) cached.splice(idx, 1)
    cachedOptionsForPage = cached 
  } else {
    cachedOptions = cached 
  }
  return cached  
}

function SectionControls(props: {listKey: ListKey, view: StateView, setView: SetView, showUrlConditions?: boolean}) {
  const { listKey, view, setView, showUrlConditions } = props
  const [commandOption, setCommandOption] = useState("speed")
  const [show, setShow] = useState(false)
  const trigger = SECTION_TRIGGER[listKey]
  const urlRuleCount = view.keybindsUrlCondition ? getSelectedParts(view.keybindsUrlCondition).length : 0

  return (
    <div className="sectionControls">
      {/* Primary select */}
      <select value={commandOption} onChange={e => {
        setCommandOption(e.target.value)
      }}>
        {getOptions(listKey === "pageKeybinds").map(v => {
          return <option key={v.value} disabled={v.disabled} value={v.value}>{v.label}</option>
        })}
      </select>

      {/* Create */}
      <button onClick={e => {
        const newKb = commandInfos[commandOption as CommandName].generate()
        if (trigger !== Trigger.PAGE) newKb.trigger = trigger
        setView({
          [listKey]: [...view[listKey], newKb]
        })
      }}>{gvar.gsm.token.create}</button>

      {/* Reset */}
      <button onClick={e => {
        if (!areYouSure()) return 
        const updates: Partial<StateView> = {
          [listKey]: SECTION_DEFAULTS[listKey]()
        }
        if (listKey === "menuKeybinds") updates.freshKeybinds = true
        setView(updates as StateView)
        if (listKey === "menuKeybinds") requestSyncContextMenu()
      }}>{gvar.gsm.token.reset}</button>

      {/* URL conditions */}
      {showUrlConditions && view[listKey]?.length > 0 && <>
        <button onClick={() => setShow(!show)}>{`${gvar.gsm.options.rules.conditions}: ${urlRuleCount}`}</button>

        {show && <URLModal 
          value={view.keybindsUrlCondition || getDefaultURLCondition(true)}
          onClose={() => setShow(false)}
          onReset={() => setView({keybindsUrlCondition: null})}
          onChange={v => {
            setView({keybindsUrlCondition: v})
          }}
        />}
      </>}
    </div>
  )
}

function handleFreshKeybinds(view: StateView, setView: SetView) {
  setView({
    menuKeybinds: produce(view.menuKeybinds, d => {
      d.forEach(kb => {
        switch (kb.replaceWithGsm) {
          case 1:
            kb.contextLabel = gvar.gsm.command.afxPitch
            break 
          case 2:
            kb.contextLabel = gvar.gsm.command.afxGain
            break 
          case 3:
            kb.contextLabel = gvar.gsm.command.afxReset
            break 
          case 4:
            kb.contextLabel = gvar.gsm.command.drawPage
            break 
          case 5:
            kb.contextLabel = `Fx :: ${gvar.gsm.token.reset}`
            break 
          case 6:
            kb.contextLabel = `Fx :: ${gvar.gsm.menuLabels.invertPage}`
            break 
          case 7:
            kb.contextLabel = `Fx :: ${gvar.gsm.menuLabels.grayscalePage}`
            break 
          case 8:
            kb.contextLabel = `Fx :: ${gvar.gsm.menuLabels.videoBrightness}`
            break 
          case 9:
            kb.contextLabel = `Fx :: ${gvar.gsm.menuLabels.videoContrast}`
            break 
          case 10:
            kb.contextLabel = gvar.gsm.command.cinema
            break 
        }
        delete kb.replaceWithGsm 
      })
    }),
    freshKeybinds: false 
  })
  requestSyncContextMenu()
}