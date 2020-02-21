import { PollShadowRoots } from "./PollShadowRoots"

export class PollQuery<T extends Element = Element> {
  elems: T[] = []
  intervalId: number
  tagNames: string[] = []
  psr = PollShadowRoots.getCommon()
  released = false 
  query: string 
  constructor(query: string, public delay: number) {
    this.intervalId = setInterval(this.handleInterval, this.delay)
    this.psr?.listeners.add(this.handleInterval)
    this.setQuery(query)
  }
  release() {
    if (this.released) return 
    this.released = true 
    clearInterval(this.intervalId)
    this.psr?.listeners.delete(this.handleInterval)
    PollShadowRoots.releaseCommon()
    delete this.elems
  }
  setQuery(query: string) {
    if (query === this.query)  {
      return 
    }
    this.query = query 
    this.tagNames = extractTagNames(query?.toUpperCase())
    this.handleInterval()
  }
  handleInterval = () => {
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