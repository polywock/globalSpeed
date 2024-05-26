import { Popover, insertRules } from "./Popover";
import { randomId } from "src/utils/helper";

export class Backdrop extends Popover {
    filterName = `d${randomId()}`
    constructor() {
        super(true)
        insertRules([
            this.supportsPopover ? (
                `#${this.id}:popover-open { width: 0px; height: 0px; margin: 0px; opacity: 0; position: fixed; left: -100px; border: none }`
            ) : (
                `#${this.id}.popoverOpenYah { position: fixed; width: 100vw; height: 100vh; left: 0px; top: 0px; margin: 0px; pointer-events: none; border: none }`
            ),
            this.supportsPopover && `#${this.id}::backdrop { backdrop-filter: var(--${this.filterName}) }`
    ], this.shadow)
    }
    release = () => {
        this._release()
    }
    show = (filter?: string) => {
        if (this.supportsPopover) {
            this.div.setAttribute('style', filter ? `--${this.filterName}: ${filter}` : undefined)
        } else {
            this.div.style.backdropFilter = filter
        }
        this.update(!!filter)
    }
}
