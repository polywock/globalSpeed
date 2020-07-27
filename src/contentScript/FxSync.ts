import { formatFilters} from "../utils/configUtils";
import { subscribeView } from "../background/GlobalState";
import { StateView } from "../types";

export class FxSync {
  released: boolean
  elementQuery: string
  elementIntervalId: number 
  backdropIntervalId: number 

  styleJail = new StyleJail()
  documentTransform = new LazyDocumentTransform()

  elemFilter: string
  elemTransform: string 
  elemTransformOrigin: string 

  backdropFilter: string
  backdropTransform: string 
  backdropTransformOrigin: string 

  lastResult: {time: number, elems: HTMLElement[]}

  client = subscribeView({elementFx: true, backdropFx: true}, window.tabInfo.tabId, true, view => {
    this.handleChange(view)
  })
  // clear resources and clear all filters.
  release = () => {
    if (this.released) return 
    this.client?.release(); delete this.client
    this.released = true 

    this.backdropIntervalId = clearInterval(this.backdropIntervalId) as null 
    this.elementIntervalId = clearInterval(this.elementIntervalId) as null 
    this.styleJail.clear()
    window.overlay.updateBackdrop()
    this.documentTransform.clear()
  }
  handleChange = (view: StateView) => {

    // cache results to avoid recalculating
    this.elemFilter = formatFilters(view.elementFx?.filters)
    this.elemTransform = formatFilters(view.elementFx?.transforms.slice().reverse())
    this.elemTransformOrigin = `${view.elementFx.originX || "center"} ${view.elementFx.originY || "center"}`

    this.backdropFilter = formatFilters(view.backdropFx.filters)
    this.backdropTransform = formatFilters(view.backdropFx.transforms.slice().reverse())
    this.backdropTransformOrigin = `${view.backdropFx.originX || "center"} ${view.backdropFx.originY || "top"}`

    const elementFxActive = view.elementFx.enabled && !!(this.elemFilter || this.elemTransform)
    const backdropFxActive = view.backdropFx.enabled && !!(this.backdropFilter || this.backdropTransform)

    // cache results to avoid recalculating 
    this.elementQuery = view.elementFx.query || "video"
    
    // If any element FX active, ensure we got our PollQuery.
    if (elementFxActive) {
      this.elementIntervalId = this.elementIntervalId ?? setInterval(this.handleElementInterval, 1000)
      this.handleElementInterval()
    } else {
      clearInterval(this.elementIntervalId); delete this.elementIntervalId
      this.styleJail.clear()
      // suspend?
    }

    // If any element FX active, ensure we got our PollQuery.
    if (backdropFxActive) {
      this.backdropIntervalId = this.backdropIntervalId ?? setInterval(this.handleBackdropInterval, 1000)
      this.handleBackdropInterval()
    } else {
      clearInterval(this.backdropIntervalId); delete this.backdropIntervalId
      this.documentTransform.clear()
      window.overlay.updateBackdrop()
       
    }
  }
  handleElementInterval = () => {
    let elems: HTMLElement[] = []
    if (this.elementQuery === "video") {
      elems = window.mediaTower.media.filter(v => v.isConnected && v instanceof HTMLVideoElement)
    } else {
      elems = CachedSelector.get(this.elementQuery)
    }

    this.styleJail.set(elems, {filter: this.elemFilter}, {transform: this.elemTransform, origin: this.elemTransformOrigin})
  }
  handleBackdropInterval = () => {

    // backdrop filter 
    if (this.backdropFilter && (window.top === window.self || document.fullscreenElement)) {
      window.overlay.updateBackdrop(this.backdropFilter)
    } else {
      window.overlay.updateBackdrop()
    }

    // backdrop transform
    if (this.backdropTransform && (window.top === window.self || document.fullscreenElement)) {
      this.documentTransform.set(this.backdropTransform, this.backdropTransformOrigin)
    } else {
      this.documentTransform.clear()
    }
  }
}



type FilterInit = {
  filter: string
}

type TransformInit = {
  transform: string,
  origin: string
}




type HTMLElementJailed = HTMLElement & {
  ogFilter?: FilterInit,
  ogTransform?: TransformInit
}


class StyleJail {
  elems: HTMLElementJailed[] = []

  set = (elems: HTMLElementJailed[], filterInit: FilterInit, transformInit: TransformInit) => {  
    // clear non-reinforced 
    this.elems.forEach(elem => {
      if (!elems.includes(elem)) {
        this.clearFilter(elem)
        this.clearTransform(elem)
      }
    })

    this.elems = elems 

    this.elems.forEach(elem => {
      if (filterInit) {
        if (!elem.ogFilter) {
          elem.ogFilter = {filter: elem.style.filter}
        }

        if (elem.style.filter != filterInit.filter) {
          elem.style.filter = filterInit.filter
        }
      } else {
        this.clearFilter(elem)
      }

      if (transformInit) {
        if (!elem.ogTransform) {
          elem.ogTransform = {transform: elem.style.transform, origin: elem.style.transformOrigin}
        }
        if (elem.style.transform != transformInit.transform) {
          elem.style.transform = transformInit.transform
        }
        if (elem.style.transformOrigin != transformInit.origin) {
          elem.style.transformOrigin = transformInit.origin
        }
      } else {
        this.clearTransform(elem)
      }
    })
  }
  clear = () => {
    this.elems.forEach(elem => {
      if (!elem.style) return 
      this.clearFilter(elem)
      this.clearTransform(elem)
    })  
    this.elems = []
  }
  clearFilter = (elem: HTMLElementJailed) => {
    if (elem.ogFilter) {
      if (elem.style.filter != elem.ogFilter.filter) {
        elem.style.filter = elem.ogFilter.filter
      }
      delete elem.ogFilter
    }
  }
  clearTransform = (elem: HTMLElementJailed) => {
    if (elem.ogTransform) {
      if (elem.style.transform != elem.ogTransform.transform) {
        elem.style.transform = elem.ogTransform.transform
      }
      if (elem.style.transformOrigin != elem.ogTransform.origin) {
        elem.style.transformOrigin = elem.ogTransform.origin
      }
      delete elem.ogTransform
    }
  }
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





//#region CachedSelector
class CachedSelector {
  static prev: {query: string, tagNames?: string[], time: number, value: HTMLElement[]}
  static get(query: string, duration = 500) {
    const { prev } = CachedSelector

    const time = new Date().getTime()
    if (prev && prev.query === query && time - prev.time < duration) {
      return prev.value
    } 
    const tagNames = (prev && prev.query === query) ? prev.tagNames : queryIntoTagNames(query)
    const value = selector(query, tagNames)
    
    CachedSelector.prev = {query, tagNames, time, value}
    return value 
  }
}

function selector(query: string, tagNames?: string[]) {
  let elems: Element[] = []

  if (tagNames?.length) {
    tagNames.forEach(tag => {
      elems = [...elems, ...document.getElementsByTagName(tag)]
    })
  } else {
    try {
      elems = [...document.querySelectorAll(query)]
    } catch (err) {
      return elems.filter(v => v instanceof HTMLElement) as HTMLElement[] 
    }
  }

  window.mediaTower.docs.forEach(doc => {
    if (!(doc instanceof ShadowRoot && doc.isConnected)) return
    try {
      elems = [...elems, ...doc.querySelectorAll(query)]
    } catch (err) {
      return elems.filter(v => v instanceof HTMLElement) as HTMLElement[] 
    }
  })

  return elems.filter(v => v instanceof HTMLElement) as HTMLElement[]
}

const CSS_NAME = /^[_a-z]+[_a-z0-9-]*$/i
export function queryIntoTagNames(query: string) {
  let tagNames: string[] = []
  for (let part of query.trim().split(",").map(v => v.trim())) {
    if (CSS_NAME.test(part)) {
      tagNames.push(part)
    } else {
      return 
    }
  }
  
  return tagNames
}
//#endregion 