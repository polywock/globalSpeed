import React from "react"
import { FilterEntry } from "../types"
import { FilterName } from "../defaults/filters"
import { Filter } from "./Filter"
import { moveItem } from "../utils/helper"
import "./Filters.scss"
import produce from "immer"


type FiltersProps = {
  filters: FilterEntry[],
  onChange: (newValue: FilterEntry[]) => void,
  isBackdrop: boolean,
  className?: string 
}

export function Filters(props: FiltersProps) {
  
  const handleFilterMove = (filterName: FilterName, down: boolean) => {
    props.onChange(produce(props.filters, d => {
      moveItem(d, v => v.name === filterName, down)
    }))
  }

  const handleFilterChange = (newValue: FilterEntry) => {
    props.onChange(produce(props.filters, d => {
      const dFilter = d.find(f => f.name === newValue.name)
      dFilter.value = newValue.value
    }))
  }

   
  return <div className={`Filters ${props.className || ""}`}>
    {props.filters.map(entry => (
      <Filter key={entry.name} onMove={handleFilterMove} entry={entry} onChange={handleFilterChange}/>
    ))}
  </div>
}