import { produce } from "immer"
import { useState } from "react"
import { SvgFilter } from "src/types"
import { svgFilterInfos } from "src/defaults/filters"
import { SvgFilterItem } from "./SvgFilterItem"
import { SVG_FILTER_ADDITIONAL } from "src/defaults/svgFilterAdditional"
import "./SvgFilterList.css"

const filterTypes = Object.keys(svgFilterInfos)
// filterTypes.splice(filterTypes.findIndex(f => f === "text"), 1)

export function SvgFilterList(props: {
   svgFilters: SvgFilter[],
   onChange: (newSvgFilters: SvgFilter[], forceEnable?: boolean) => void
}) {
   const [command, setCommand] = useState("mosaic")

   return <div className="SvgFilterList">
      <div className="header">{gvar.gsm.filter.otherFilters.header}</div>
      <div className="list">
         {props.svgFilters.map(f => <SvgFilterItem key={f.id} filter={f} onChange={newFilter => {
            const typeInfo = SVG_FILTER_ADDITIONAL[newFilter.type]
            const isActive = newFilter.enabled && typeInfo.isValid(newFilter)
            props.onChange(produce(props.svgFilters, dArr => {
               let idx = dArr.findIndex(v => v.id === f.id)
               if (idx >= 0) dArr[idx] = newFilter
            }), isActive)
         }} list={props.svgFilters} listOnChange={props.onChange}/>)}
      </div>
      <div className="controls">
         <select value={command} onChange={e => {
            setCommand(e.target.value)
         }}>
            {filterTypes.map(t => (
               <option value={t}>{(gvar.gsm.filter.otherFilters as any)[t]}</option>
            ))}
         </select>
         <button onClick={() => {
         props.onChange(produce(props.svgFilters, dArr => {
            dArr.push(svgFilterInfos[command as keyof typeof svgFilterInfos].generate())
         }), true)
         }}>{gvar.gsm.token.create}</button>
      </div>
   </div>
}

