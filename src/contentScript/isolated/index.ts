
import type { TabInfo } from '../../utils/browserUtils'
import { Overseer } from './Overseer'


declare global {
  interface GlobalVar {
    tabInfo: TabInfo,
    os: Overseer,
    fallbackId: number,
    ghostMode?: boolean,
    isTopFrame?: boolean,
    topFrameOrigin?: string 
  }
}

async function main() {
  if ((globalThis as any).gvar) return 
  ;(globalThis as any).gvar = gvar 
  ;(document as any).gvar = gvar 
  gvar.isTopFrame = window.self === window.top
  gvar.os = new Overseer()
  gvar.os.init()
}


main()