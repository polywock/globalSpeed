
export function getShadow(x: HTMLElement): ShadowRoot {
    if (!x) return 
    return chrome.dom ? chrome.dom.openOrClosedShadowRoot(x) : (x as any).openOrClosedShadowRoot
}


export function getLeaf(document: DocumentOrShadowRoot, key: keyof DocumentOrShadowRoot): Element {
    let doc: DocumentOrShadowRoot = document 
    while (true) {
        let item = doc[key]
        if (!item) return (doc as ShadowRoot)?.host 
        doc = getShadow(item as HTMLElement)
        if (!doc) return item as Element
    }
}

export function getReal<T>(v: T): T {
    return ((v as any)?.wrappedJSObject ?? v) as T 
}