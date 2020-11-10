import React from "react"
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
          }))
        }}/>
    ))}
  </div>
}


type FilterProps = {
  entry: FilterEntry,
  onChange: (newValue: FilterEntry) => void,
  onMove: (down: boolean) => void,
}

export function Filter(props: FilterProps) {
  const { entry } = props 
  const filterInfo = filterInfos[entry.name]

  return <div className="Filter">
    <Move onMove={down => props.onMove(down)}/>
    <SliderPlus
        label={window.gsm.filter[entry.name]}
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