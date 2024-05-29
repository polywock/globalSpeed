import { Popover } from "./Popover";
import { insertStyle } from "src/utils/nativeUtils";
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
        this._div.style.backdropFilter = filter
        this._update(!!filter)
    }
}
