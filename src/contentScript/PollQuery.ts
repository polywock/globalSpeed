import { PollShadowRoots } from "./PollShadowRoots"

export class PollQuery<T extends Element = Element> {
  elems: T[]
  intervalId: number
  tagNames: string[] = []
  elapsed = 0
  psr = PollShadowRoots.getCommon()
  released = false 
  constructor(public query: string, public visibleDelay: number) {
    document.addEventListener("visibilitychange", this.handleVisibilityChange)
    this.handleVisibilityChange()
    this.psr?.listeners.add(this.handleInterval)
  }
  release() {
    if (this.released) return 
    this.released = true 
    this.psr?.listeners.delete(this.handleInterval)
    PollShadowRoots.releaseCommon()
    document.removeEventListener("visibilitychange", this.handleVisibilityChange)
    this.elems = []
  }
  setQuery(query: string) {
    if (query === this.query)  {
      return 
    }
    this.query = query 
    this.tagNames = extractTagNames(query?.toUpperCase())
  }
  handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      if (this.intervalId == null) {
        this.intervalId = setInterval(this.handleInterval, this.visibleDelay)
      }
    } else {
      clearInterval(this.intervalId)
    }
  }
  handleInterval = () => {
    const oldTime = new Date().getTime()
    this.elems = []
    if (this.tagNames?.length > 0) {
    this.tagNames.forEach(tag => {
        this.elems = [...this.elems, ...document.getElementsByTagName(tag)] as T[]
      })
    } else {
      this.elems = [...document.querySelectorAll(this.query)] as T[]
    }

    this.psr?.shadowRoots.forEach(root => {
      this.elems = [...this.elems, ...root.querySelectorAll(this.query)] as T[]
    })
    this.elapsed += new Date().getTime() - oldTime
  }
}


const CSS_NAME = /^[_a-z]+[_a-z0-9-]*$/i
 
export function extractTagNames(query: string) {
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