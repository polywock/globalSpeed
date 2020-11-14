import { useState } from "react"
import { FilterEntry } from "../types"
import { filterInfos } from "../defaults/filters"
import { SliderPlus } from "../comps/SliderPlus"
import { moveItem } from "../utils/helper"
import produce from "immer"
import { Move } from "../comps/Move"
import "./Filters.scss"


type FiltersProps = {
  filters: FilterEntry[],
  onChange: (newValue: FilterEntry[]) => void,
  className?: string 
}

export function Filters(props: FiltersProps) {
  const [syncScale, setSyncScale] = useState(false)
   
  return <div className={`Filters ${props.className || ""}`}>
    {props.filters.map(entry => (
      <Filter 
        key={entry.name} 
        entry={entry} 
        onMove={down => {
          props.onChange(produce(props.filters, d => {
            moveItem(d, v => v.name === entry.name, down)
          }))
        }} 
        onChange={newValue => {
          props.onChange(produce(props.filters, d => {
            const dFilter = d.find(f => f.name === entry.name)
            dFilter.value = newValue.value

            if (syncScale && dFilter.name.startsWith("scale")) {
              d.filter(entry => entry.name.startsWith("scale")).forEach(entry => {
                entry.value = newValue.value 
              })
            }
          }))
        }}
        syncChange={entry.name.startsWith("scale") ? () => setSyncScale(!syncScale) : null}
        syncValue={syncScale}
      />
    ))}
  </div>
}


type FilterProps = {
  entry: FilterEntry,
  onChange: (newValue: FilterEntry) => void,
  onMove: (down: boolean) => void,
  syncChange?: () => void
  syncValue?: boolean
}

export function Filter(props: FilterProps) {
  const { entry } = props 
  const filterInfo = filterInfos[entry.name]

  return <div className="Filter">
    <Move onMove={down => props.onMove(down)}/>
    <SliderPlus
        label={<>
          {window.gsm.filter[entry.name]}
          {!props.syncChange ? null : <button onClick={() => props.syncChange()} style={{padding: "0px 5px", marginLeft: "10px"}} className={`toggle ${props.syncValue ? "active" : ""}`}>:</button>}
        </>}
        value={entry.value}
        sliderMin={filterInfo.sliderMin}
        sliderMax={filterInfo.sliderMax}
        sliderStep={filterInfo.sliderStep}
        min={filterInfo.min}
        max={filterInfo.max}
        default={filterInfo.default}
        onChange={newValue => {
          props.onChange(produce(entry, d => {
            d.value = newValue
          }))
        }}
      />
  </div>
}