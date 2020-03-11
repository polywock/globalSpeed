import React from "react"
import { FilterValue } from "../types"
import produce from "immer"
import { filterInfos, FilterName } from "../defaults/filters"
import { clamp } from "../utils/helper"
import "./FilterControl.scss"
import { NumericControl } from "../comps/NumericControl"
import { GoArrowUp, GoArrowDown } from "react-icons/go"
import { GiAnticlockwiseRotation } from "react-icons/gi"


type FilterControlProps = {
  filterValue: FilterValue,
  onChange: (newValue: FilterValue) => void,
  onMove: (filterName: FilterName, down: boolean) => void,
}

export function FilterControl(props: FilterControlProps) {
  const { filterValue } = props 

  const filterInfo = filterInfos[filterValue.filter]
  
  return <div className="FilterControl">
    <div className="move">
      <button onClick={() => props.onMove(filterValue.filter, false)}>
        <GoArrowUp size="20px"/>
      </button> 
      <button onClick={() => props.onMove(filterValue.filter, true)}>
        <GoArrowDown size="20px"/>
      </button>
    </div>
    <div className="core">
      <div className="header">
        <span>{window.gsm[filterInfo.name] || ""}</span>
        <button onClick={e => {
          props.onChange(produce(filterValue, d => {
            d.value = filterInfo.default
          }))
        }}><GiAnticlockwiseRotation size="14px"/></button>
      </div>
      <NumericControl 
        value={filterValue.value}
        onChange={newValue => {
          props.onChange(produce(filterValue, d => {
            d.value = clamp(filterInfo.min, filterInfo.max, newValue)
          }))
        }}
        largeStep={filterInfo.largeStep}
        smallStep={filterInfo.smallStep}
        min={filterInfo.min}
        max={filterInfo.max}
        inputNoNull={true}
      />
    </div>
  </div>
}