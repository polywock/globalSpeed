import { requestTabInfo } from "src/utils/browserUtils";
import { ConfigSync } from "./ConfigSync";
import { MediaTower } from "./MediaTower";
import { DetectOpen } from "./utils/DetectOpen";
import { NativeFs } from "./utils/NativeFs";
import { SmartFs } from "./utils/SmartFs";
import { StratumServer } from "./utils/StratumServer";
import { VisibleSync } from "./utils/VisibleSync";
import { timeout } from "src/utils/helper";
import { fetchView } from "src/utils/state";
import { MessageTower } from "./MessageTower";
import { SpeedSync } from "./SpeedSync";
import { EventsListener } from "./utils/EventsListener";
import { Indicator } from "./utils/Indicator";
import { Interactive } from "./utils/Interactive";
import type { Circle } from "./utils/Circle";

export class Overseer {
    eListen: EventsListener
    detectOpen: DetectOpen
    stratumServer: StratumServer
    mediaTower: MediaTower
    smartFs: SmartFs
    nativeFs: NativeFs
    messageTower: MessageTower
    speedSync: SpeedSync

    visibleSync: VisibleSync
    configSync: ConfigSync
    indicator: Indicator
    indicatorAlt: Indicator
    itc?: Interactive
    circle?: Circle

    orphaned = false 
    released = false 

    init = async () => {
        this.eListen = new EventsListener()
        this.detectOpen = new DetectOpen()
        this.stratumServer = new StratumServer()
        this.mediaTower = new MediaTower()
        this.smartFs = new SmartFs()
        this.nativeFs = new NativeFs()
        this.messageTower = new MessageTower()
        this.speedSync = new SpeedSync()

        this.detectOpen.cbs.add(() => {
            this.eListen.update()
        })

        await this.initAsync()
        if (document.readyState === "loading")  {
            document.addEventListener("DOMContentLoaded", this.handleDOMLoaded, {capture: true, passive: true, once: true})
        } else {
            this.handleDOMLoaded()
        }
    }
    initAsync = async () => {
        gvar.tabInfo = await requestTabInfo()
        if (gvar.tabInfo.frameId) gvar.topFrameOrigin = await chrome.runtime.sendMessage({type: 'GET_TOP_ORIGIN'})

        // if failed to get, try again after a few seconds. (firefox sometimes)
        if (!gvar.tabInfo) {
            await timeout(3000)
            gvar.tabInfo = await requestTabInfo()

            if (!gvar.tabInfo) return 
        }

        const view = (await fetchView({indicatorInit: true})) || {}

        if (gvar.isTopFrame) {
            this.indicator = new Indicator()
            this.indicator.setInit(view.indicatorInit || {})
        }
    }
    handleDOMLoaded = () => {
        this.visibleSync = new VisibleSync(this.handleVisibleChange)
    }
    handleVisibleChange = () => {
        if (document.hidden) {
            this.configSync?.release(); 
            delete this.configSync
        } else {
            this.configSync = this.configSync ?? new ConfigSync() 
        }
    }
    handleOrphan = () => {
        if (this.orphaned) return 
        this.orphaned = true 
        this.release()
    }
    release = () => {
        if (this.released) return 
        this.released = true 
        
        this.indicator?.release(); delete this.indicator
        this.indicatorAlt?.release(); delete this.indicatorAlt
        this.smartFs?.release(); delete this.smartFs
        this.nativeFs?.release(); delete this.nativeFs
        this.visibleSync?.release(); delete this.visibleSync
        this.configSync?.release(); delete this.configSync
        this.itc?.release(); delete this.itc
        this.circle?.release(); delete this.circle
        this.speedSync?.release(); delete this.speedSync
    }
}