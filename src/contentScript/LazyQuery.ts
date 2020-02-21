import { PollShadowRoots } from "./PollShadowRoots";
import { DeepMutationObserver } from "./DeepMutationObserver";
import { extractTagNames } from "./PollQuery";


export class LazyQuery<T extends Element = Element> {
  elems: T[] = []
  query: string
  tagNames: string[] = []
  psr = PollShadowRoots.getCommon()
  dmo = DeepMutationObserver.getCommon()
  released = false 
  constructor(query: string) {
    this.dmo?.listeners.add(this.handleDmoChange)
    this.psr?.listeners.add(this.handlePsrChange)
    this.setQuery(query)
  }
  release = () => {
    if (this.released) return 
    this.released = true 
    this.dmo?.listeners.delete(this.handleDmoChange)
    this.psr?.listeners.delete(this.handlePsrChange)
    DeepMutationObserver.releaseCommon()
    PollShadowRoots.releaseCommon()
    delete this.elems
  }
  handleDmoChange = (muts: MutationRecord[]) => {
    muts.forEach(mut => {
      mut.addedNodes.forEach(node => {
        if (!isElement(node)) {
          return 
        }
        this.elems = [...new Set([...this.elems, ...findDescendantMatches(node, this.query, this.tagNames) as T[]])]
      })
      
      if (mut.removedNodes?.length > 0) {
        this.elems = [...this.elems].filter(v => v.isConnected)
      }
    })
  }
  handlePsrChange = (added: ShadowRoot[], removed: ShadowRoot[]) => {
    this.elems = [...this.elems].filter(v => v.isConnected)
    
    added.forEach(doc => {
      this.elems = [...this.elems, ...doc.querySelectorAll(this.query)] as T[]
    })

  }
  init = () => {
    const docs = [document, ...(this.psr?.shadowRoots || [])];
    this.elems = []
    docs.forEach(doc => {
      this.elems = [...this.elems, ...doc.querySelectorAll(this.query)] as T[]
    })
  }
  setQuery = (query: string) => {
    if (this.query === query) {
      return 
    }
    this.query = query 
    this.tagNames = extractTagNames(query?.toUpperCase())
    this.init()
  }
}



function findDescendantMatches(ctx: Element, query: string, tagNames: string[], arr: Element[] = []) {
  if (tagNames?.length > 0) {
    if (tagNames.includes(ctx.tagName)) {
      arr.push(ctx)
    }
  } else {
    if (ctx.matches(query)) {
      arr.push(ctx)
    }
  }

  let node = ctx.firstElementChild
  if (!node) return arr
  findDescendantMatches(node, query, tagNames, arr)

  while (node = node.nextElementSibling) {
    findDescendantMatches(node, query, tagNames, arr)
  }

  return arr
}

function isElement(v: Node): v is Element {
  return v.nodeType === 1
}
