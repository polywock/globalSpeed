import { Popover, insertStyle } from "./Popover";
import styles from "./Backdrop.css?raw"

export class Backdrop extends Popover {
    constructor() {
        super()
        insertStyle(styles, this._shadow)
    }
    release = () => {
        this._release()
    }
    lastFilter: string
    show = (filter?: string) => {
        if (filter === this.lastFilter) return 
        this.lastFilter = filter 

        if (this._supportsPopover) {
            this._div.setAttribute('style', filter ? `--filter: ${filter}` : undefined)
        } else {
            this._div.style.backdropFilter = filter
        }
        this._update(!!filter)
    }
}
