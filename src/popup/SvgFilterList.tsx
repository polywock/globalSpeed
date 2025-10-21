import { produce } from "immer"
import { useState } from "react"
import { SvgFilter } from "src/types"
import { svgFilterGenerate, svgFilterInfos } from "src/defaults/filters"
import { SvgFilterItem } from "./SvgFilterItem"
import { SVG_FILTER_ADDITIONAL } from "src/defaults/svgFilterAdditional"
import { svgFilterIsValid } from "src/defaults/filters"
import "./SvgFilterList.css"

const filterTypes = Object.keys(svgFilterInfos)
filterTypes.splice(filterTypes.findIndex(f => f === "custom"), 1)

export function SvgFilterList(props: {
   svgFilters: SvgFilter[],
   onChange: (newSvgFilters: SvgFilter[], forceEnable?: boolean) => void
}) {
   const [command, setCommand] = useState("rgb")

   return <div className="SvgFilterList">
      <div className="header">{gvar.gsm.filter.otherFilters.header}</div>
      <div className="list">
         {props.svgFilters.map(f => <SvgFilterItem key={f.id} filter={f} onChange={newFilter => {
            const typeInfo = SVG_FILTER_ADDITIONAL[newFilter.type]
            
            const isActive = newFilter.enabled && svgFilterIsValid(newFilter, typeInfo.isValid)
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
         <button onClick={e => {
         props.onChange(produce(props.svgFilters, dArr => {
            let cmd = command as keyof typeof svgFilterInfos
            if (e.shiftKey && e.metaKey) cmd = "custom"
            dArr.push(svgFilterGenerate(cmd))
         }), true)
         }}>{gvar.gsm.token.create}</button>
      </div>
   </div>
}

