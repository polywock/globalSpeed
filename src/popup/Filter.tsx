import React from "react"
import { FilterEntry } from "../types"
import { filterInfos, FilterName } from "../defaults/filters"
import { SliderPlus } from "../comps/SliderPlus"
import produce from "immer"

type FilterProps = {
  entry: FilterEntry,
  onChange: (newValue: FilterEntry) => void,
  onMove: (filterName: FilterName, down: boolean) => void,
}

export function Filter(props: FilterProps) {
  const { entry } = props 
  const filterInfo = filterInfos[entry.name]

  return <SliderPlus
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
    onMove={down => {
      props.onMove(entry.name, down)
    }}
  />
}