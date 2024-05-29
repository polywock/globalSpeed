import { formatFilters} from "../../utils/configUtils";
import { SubscribeView } from "../../utils/state";
import { StateView } from "../../types";
import { getDefaultFx } from "src/defaults";
import { Backdrop } from "./utils/Backdrop";
import { insertStyle } from "src/utils/nativeUtils";

export class FxSync {
  released: boolean
  elementQuery: string
  elementIntervalId: number 
  backdropIntervalId: number 

  backdrop: Backdrop
  tempStyle: TemporaryStyle
  documentTransform: LazyDocumentTransform

  elemFilter: string
  elemTransform: string 
  elemTransformOrigin: string 

  backdropFilter: string
  backdropTransform: string 
  backdropTransformOrigin: string 

  client = new SubscribeView({elementFx: true, backdropFx: gvar.isTopFrame}, gvar.tabInfo.tabId, true, view => {
    view.elementFx = view.elementFx ?? getDefaultFx()
    view.backdropFx = view.backdropFx ?? getDefaultFx()
    this.handleChange(view)
  })
  // clear resources and clear all filters.
  release = () => {
    if (this.released) return 
    this.released = true 

    this.client?.release(); delete this.client
    
    this.tempStyle?.release()
    delete this.tempStyle

    this.backdrop?.release()
    delete this.backdrop

    this.documentTransform?.clear()
    delete this.documentTransform
  }
  handleChange = (view: StateView) => {


    let style = calculateStyle(view.elementFx.enabled, view.elementFx.query || "video, img", formatFilters(view.elementFx.filters), formatFilters(view.elementFx.transforms.slice().reverse()), `${view.elementFx.originX || "center"} ${view.elementFx.originY || "center"}`)

    if (style) {
      if (this.tempStyle && this.tempStyle.style !== style) {
        this.tempStyle.release()
        delete this.tempStyle
      }
      this.tempStyle = this.tempStyle || new TemporaryStyle(style)
    } else {
      this.tempStyle?.release()
      delete this.tempStyle
    }
    
    if (!gvar.isTopFrame) return 
    
    this.backdropFilter = formatFilters(view.backdropFx.filters)
    this.backdropTransform = formatFilters(view.backdropFx.transforms.slice().reverse())
    this.backdropTransformOrigin = `${view.backdropFx.originX || "center"} ${view.backdropFx.originY || "top"}`
    const backdropEnabled = view.backdropFx.enabled
    
    if (backdropEnabled && this.backdropFilter) {
      this.backdrop = this.backdrop || new Backdrop()
      this.backdrop.show(this.backdropFilter)
    } else {
      this.backdrop?.release()
      delete this.backdrop
    }

    if (backdropEnabled && this.backdropTransform) {
      this.documentTransform = this.documentTransform || new LazyDocumentTransform()
      this.documentTransform.set(this.backdropTransform, this.backdropTransformOrigin)
    } else {
      this.documentTransform?.clear()
      delete this.documentTransform
    }
  }
}


function calculateStyle(enabled: boolean, selector: string, filters: string, transforms: string, origin: string) {
  if (!enabled || !selector || !(filters || transforms)) return null 
  let statements = []
  if (filters) statements.push(`filter: ${filters} !important`)
  if (transforms) {
    statements.push(`transform: ${transforms} !important`)
    origin && statements.push(`transform-origin: ${origin} !important`)
  }

  return `:is(${selector}, #proooof > #essi > #onal) {${statements.join(";")}}`
}



class LazyDocumentTransform {
  memoized: {transform: string, origin: string}
  set = (transform: string, transformOrigin: string) => {
    this.memoized = this.memoized || {transform: document.body.style.transform, origin: document.body.style.transformOrigin}

    if (document.body.style.transform !== transform) {
      document.body.style.transform = transform
    }
    if (document.body.style.transformOrigin !== transformOrigin) {
      document.body.style.transformOrigin = transformOrigin
    }
  }
  clear = () => {
    if (!this.memoized) return 
    document.body.style.transform = this.memoized.transform
    document.body.style.transformOrigin = this.memoized.origin
    delete this.memoized
  }
}


class TemporaryStyle {
  processed: Set<ShadowRoot | HTMLElement> = new Set() 
  styles: HTMLStyleElement[] = []
  released = false 
  constructor(public style: string) {
    console.log("STYLE: ", style)
    this.processAll()
  }
  release = () => {
    if (this.released) return 
    this.released = true 
    gvar.os.mediaTower.newDocCallbacks.delete(this.processAll)
    this.styles.forEach(s => s.remove())
    delete this.styles
    this.processed.clear()
    delete this.processed
  }
  processAll = () => {
    this.process(document.documentElement)
    let shadowRoots = ([...gvar.os.mediaTower.docs].filter(v => v instanceof ShadowRoot) as ShadowRoot[]).filter(v => v.host.isConnected)
    shadowRoots.forEach(this.process)
  }
  process = (doc: ShadowRoot | HTMLElement) => {
    if (this.processed.has(doc)) return 
    this.processed.add(doc)
    this.styles.push(insertStyle(this.style, doc))
  }
}