import { Popover, insertRules } from "./Popover";
import { randomId } from "src/utils/helper";

export class Backdrop extends Popover {
    filterName = `d${randomId()}`
    constructor() {
        super(true)
        insertRules([
            `#${this.id}:popover-open { width: 0px; height: 0px; margin: 0px; opacity: 0; position: fixed; left: -100px; border: none }`,
            `#${this.id}::backdrop { backdrop-filter: var(--${this.filterName}) }`
    ], this.shadow)
    }
    release = () => {
        this._release()
    }
    show = (filter?: string) => {
        this.div.setAttribute('style', filter ? `--${this.filterName}: ${filter}` : undefined)
        this.update(!!filter)
    }
}
