import { formatFilters, hasActiveSvgFilters } from "../../utils/configUtils"
import { SubscribeView } from "../../utils/state"
import { StateView, SvgFilter } from "../../types"
import { getDefaultFx } from "src/defaults"
import { Backdrop } from "./utils/Backdrop"
import { createSVGElement, randomId } from "src/utils/helper"
import { SVG_FILTER_ADDITIONAL } from "src/defaults/svgFilterAdditional"

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

  client = new SubscribeView({ elementFx: true, backdropFx: gvar.isTopFrame }, gvar.tabInfo.tabId, true, view => {
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


    let styleInfo = calculateStyle(view.elementFx.enabled, view.elementFx.query || "video", formatFilters(view.elementFx.filters), formatFilters(view.elementFx.transforms.slice().reverse()), `${view.elementFx.originX || "center"} ${view.elementFx.originY || "center"}`, view.elementFx.svgFilters)

    if (styleInfo) {
      if (this.tempStyle && this.tempStyle.styleInfo.styleString !== styleInfo.styleString) {
        this.tempStyle.release()
        delete this.tempStyle
      }
      this.tempStyle = this.tempStyle || new TemporaryStyle(styleInfo)
    } else {
      this.tempStyle?.release()
      delete this.tempStyle
    }

    if (!gvar.isTopFrame) return

    
    const backdropSimpleFilter = formatFilters(view.backdropFx.filters)
    const backdropTransform = formatFilters(view.backdropFx.transforms.slice().reverse())
    const backdropTransformOrigin = `${view.backdropFx.originX || "center"} ${view.backdropFx.originY || "top"}`
    const backdropStyleInfo = calculateStyle(view.backdropFx.enabled, "placeholder", backdropSimpleFilter, backdropTransform, backdropTransformOrigin, view.backdropFx.svgFilters)
    const backdropEnabled = view.backdropFx.enabled

    if (backdropEnabled && backdropStyleInfo?.filterValue) {
      this.backdrop = this.backdrop || new Backdrop()
      this.backdrop.show(backdropStyleInfo.filterValue, backdropStyleInfo.svg)
    } else {
      this.backdrop?.release()
      delete this.backdrop
    }

    if (backdropEnabled && backdropTransform) {
      this.documentTransform = this.documentTransform || new LazyDocumentTransform()
      this.documentTransform.set(backdropTransform, backdropTransformOrigin)
    } else {
      this.documentTransform?.clear()
      delete this.documentTransform
    }
  }
}

function calculateStyle(enabled: boolean, selector: string, filters: string, transforms: string, origin: string, svgFilters: SvgFilter[]) {
  if (!enabled || !selector || !(filters || transforms || hasActiveSvgFilters(svgFilters))) return null
  let statements = []
  if (transforms) {
    statements.push(`transform: ${transforms} !important`)
    origin && statements.push(`transform-origin: ${origin} !important`)
  }

  let filterElements: SVGElement[]
  let filterSvgUrls
  if (svgFilters?.length) {
    
    try {
      let colocatedInfos = svgFilters.map(f => {
        const typeInfo = SVG_FILTER_ADDITIONAL[f.type]
        if (!(f.enabled && typeInfo.isValid(f))) return 
        let id = `svg_${randomId()}`
        const text = typeInfo.format(f)
        if (!text) return 
        let filterElement = createSVGElement(text)
        filterElement.id = id
        return { filterElement, id }
      }).filter(info => info)
      
      filterSvgUrls = colocatedInfos.map(s => `url(#${s.id})`).join(' ')
      filterElements = colocatedInfos.map(s => s.filterElement)
    } catch {
      filterSvgUrls = filterElements = null
    }
  }

  let filterValue: string 
  if (filters || filterSvgUrls) {
    filterValue = `${filters || ''} ${filterSvgUrls || ''}`
    statements.push(`filter: ${filterValue} !important`)
  }

  const styleString = `:is(${selector}, #proooof > #essi > #onal) {${statements.join(";")}}`
  const styleTemplate = document.createElement("style")
  styleTemplate.innerHTML = styleString

  let svg: SVGElement
  if (filterElements?.length) {
    svg = createSVGElement(`<svg width="0" height="0" style="position:fixed;left:-9999px;top:-9999px" aria-hidden="true"></svg>`)
    filterElements.forEach(filterElem => {
      svg.appendChild(filterElem)
    })
  }

  return { styleString, styleTemplate, svg, filterValue }
}



class LazyDocumentTransform {
  memoized: { transform: string, origin: string }
  set = (transform: string, transformOrigin: string) => {
    this.memoized = this.memoized || { transform: document.body.style.transform, origin: document.body.style.transformOrigin }

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
  appended: Element[] = []
  released = false
  constructor(public styleInfo: ReturnType<typeof calculateStyle>) {
    this.processAll()
  }
  release = () => {
    if (this.released) return
    this.released = true
    gvar.os.mediaTower.newDocCallbacks.delete(this.processAll)
    this.appended.forEach(s => s.remove())
    delete this.appended
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
    const style = this.styleInfo.styleTemplate.cloneNode(true) as Element
    doc.appendChild(style)
    this.appended.push(style)

    if (this.styleInfo.svg) {
      const svg = this.styleInfo.svg.cloneNode(true) as Element
      doc.appendChild(svg)
      this.appended.push(svg)
    }
  }
}