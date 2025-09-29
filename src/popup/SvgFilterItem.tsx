import { produce } from "immer"
import { SvgFilter } from "src/types"
import { FaPowerOff } from "react-icons/fa"
import { GoArrowDown, GoArrowUp, GoX } from "react-icons/go"
import { moveItem } from "src/utils/helper"
import { SliderPlus } from "src/comps/SliderPlus"
import { SVG_COLOR_MATRIX_PRESETS, SVG_MOSAIC_PRESETS, svgFilterInfos } from "src/defaults/filters"
import { Tooltip } from "src/comps/Tooltip"
import { SVG_FILTER_ADDITIONAL } from "src/defaults/svgFilterAdditional"
import { useState } from "react"
import "./SvgFilterItem.css"

const MOSAIC_DEFAULT = svgFilterInfos["mosaic"].generate()

export function SvgFilterItem(props: {
   filter: SvgFilter,
   onChange: (newValue: SvgFilter) => void
   list: SvgFilter[]
   listOnChange: (newValue: SvgFilter[]) => void
}) {
   const { filter, list, onChange, listOnChange } = props
   const presetInfo = SVG_TYPE_TO_PRESET[filter.type]
   const [currentPreset, setCurrentPreset] = useState("")

   return <div className="SvgFilter">
      <div className="header">
         <div className={filter.enabled ? 'active' : 'muted'}><FaPowerOff size="1.21rem" onClick={() => {
            onChange(produce(filter, v => {
               v.enabled = !v.enabled
            }))
         }} /></div>
         {(gvar.gsm.filter.otherFilters as any)[filter.type]}
         <button className="icon" onClick={() => {
            listOnChange(produce(list, d => {
               moveItem(d, v => v.id === filter.id, "U")
            }))
         }}>
            <GoArrowUp size="1.42rem" />
         </button>
         <button className="icon" onClick={() => {
            listOnChange(produce(list, d => {
               moveItem(d, v => v.id === filter.id, "D")
            }))
         }}>
            <GoArrowDown size="1.42rem" />
         </button>
         <div><GoX size="1.6rem" onClick={() => {
            listOnChange(produce(list, list => {
               const idx = list.findIndex(v => v.id === filter.id)
               if (idx >= 0) list.splice(idx, 1)
            }))
         }} /></div>
      </div>
      {presetInfo && (
         <div className="presets">
            <div>{gvar.gsm.filter.otherFilters.presets}</div>
            <select value={currentPreset} onChange={e => {
               setCurrentPreset(e.target.value || null)
               const preset = presetInfo.options.find(o => o.id === e.target.value)
               preset && presetInfo.handler(filter, onChange, preset)
            }}>
               <option value={""}>{"---"}</option>
               {presetInfo.options.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.id}</option>
               ))}
            </select>
         </div>
      )}
      <div className="core">
         {filter.type === "text" && (
            <textarea rows={5} style={{ width: '100%' }} onChange={e => {
               onChange(produce(filter, v => {
                  v.text = e.target.value
               }))
            }}>{filter.text}</textarea>
         )}

         {/* Mosaic  */}
         {filter.type === "mosaic" && <>
            {/* Block size  */}
            <SliderPlus
               label={<>
                  {gvar.gsm.filter.otherFilters.blockX}
                  <Tooltip align="top" title={gvar.gsm.token.aspectLock}>
                     <button onClick={() => {
                        onChange(produce(filter, v => {
                           v.mosaic.blockAspect = !v.mosaic.blockAspect
                        }))
                     }} style={{ padding: "0px 5px", marginLeft: "10px" }} className={`toggle ${filter.mosaic.blockAspect ? "active" : ""}`}>:</button>
                  </Tooltip>
               </>}
               value={filter.mosaic.blockX}
               sliderMin={1}
               sliderMax={100}
               sliderStep={1}
               min={1}
               max={1000}
               default={MOSAIC_DEFAULT.mosaic.blockX}
               onChange={newValue => {
                  onChange(produce(filter, v => {
                     v.mosaic.blockX = newValue
                     if (v.mosaic.blockAspect) v.mosaic.blockY = newValue
                  }))
               }}
            />
            <SliderPlus
               label={<>
                  {gvar.gsm.filter.otherFilters.blockY}
                  <Tooltip align="top" title={gvar.gsm.token.aspectLock}>
                     <button onClick={() => {
                        onChange(produce(filter, v => {
                           v.mosaic.blockAspect = !v.mosaic.blockAspect
                        }))
                     }} style={{ padding: "0px 5px", marginLeft: "10px" }} className={`toggle ${filter.mosaic.blockAspect ? "active" : ""}`}>:</button>
                  </Tooltip>
               </>}
               value={filter.mosaic.blockY}
               sliderMin={1}
               sliderMax={100}
               sliderStep={1}
               min={1}
               max={1000}
               default={MOSAIC_DEFAULT.mosaic.blockY}
               onChange={newValue => {
                  onChange(produce(filter, v => {
                     v.mosaic.blockY = newValue
                     if (v.mosaic.blockAspect) v.mosaic.blockX = newValue
                  }))
               }}
            />
            <br />
            {/* Detail size  */}
            <SliderPlus
               label={<>
                  {gvar.gsm.filter.otherFilters.detailX}
                  <Tooltip align="top" title={gvar.gsm.token.aspectLock}>
                     <button onClick={() => {
                        onChange(produce(filter, v => {
                           v.mosaic.sampleAspect = !v.mosaic.sampleAspect
                        }))
                     }} style={{ padding: "0px 5px", marginLeft: "10px" }} className={`toggle ${filter.mosaic.sampleAspect ? "active" : ""}`}>:</button>
                  </Tooltip>
               </>}
               value={filter.mosaic.sampleNormalX}
               sliderMin={0}
               sliderMax={1}
               sliderStep={0.001}
               min={0}
               max={1}
               default={MOSAIC_DEFAULT.mosaic.sampleNormalX}
               onChange={newValue => {
                  onChange(produce(filter, v => {
                     v.mosaic.sampleNormalX = newValue
                     if (v.mosaic.sampleAspect) v.mosaic.sampleNormalY = newValue
                  }))
               }}
            />
            <SliderPlus
               label={<>
                  {gvar.gsm.filter.otherFilters.detailY}
                  <Tooltip align="top" title={gvar.gsm.token.aspectLock}>
                     <button onClick={() => {
                        onChange(produce(filter, v => {
                           v.mosaic.sampleAspect = !v.mosaic.sampleAspect
                        }))
                     }} style={{ padding: "0px 5px", marginLeft: "10px" }} className={`toggle ${filter.mosaic.sampleAspect ? "active" : ""}`}>:</button>
                  </Tooltip>
               </>}
               value={filter.mosaic.sampleNormalY}
               sliderMin={0}
               sliderMax={1}
               sliderStep={0.001}
               min={0}
               max={1}
               default={MOSAIC_DEFAULT.mosaic.sampleNormalY}
               onChange={newValue => {
                  onChange(produce(filter, v => {
                     v.mosaic.sampleNormalY = newValue
                     if (v.mosaic.sampleAspect) v.mosaic.sampleNormalX = newValue
                  }))
               }}
            />
            <br />
            {/* Stretch size  */}
            <SliderPlus
               label={<>
                  {gvar.gsm.filter.otherFilters.stretchX}
                  <Tooltip align="top" title={gvar.gsm.token.aspectLock}>
                     <button onClick={() => {
                        onChange(produce(filter, v => {
                           v.mosaic.scalingAspect = !v.mosaic.scalingAspect
                        }))
                     }} style={{ padding: "0px 5px", marginLeft: "10px" }} className={`toggle ${filter.mosaic.scalingAspect ? "active" : ""}`}>:</button>
                  </Tooltip>
               </>}
               value={filter.mosaic.scalingNormalX}
               sliderMin={0}
               sliderMax={10}
               sliderStep={0.01}
               min={0}
               max={100}
               default={MOSAIC_DEFAULT.mosaic.scalingNormalX}
               onChange={newValue => {
                  onChange(produce(filter, v => {
                     v.mosaic.scalingNormalX = newValue
                     if (v.mosaic.scalingAspect) v.mosaic.scalingNormalY = newValue
                  }))
               }}
            />
            <SliderPlus
               label={<>
                  {gvar.gsm.filter.otherFilters.stretchY}
                  <Tooltip align="top" title={gvar.gsm.token.aspectLock}>
                     <button onClick={() => {
                        onChange(produce(filter, v => {
                           v.mosaic.scalingAspect = !v.mosaic.scalingAspect
                        }))
                     }} style={{ padding: "0px 5px", marginLeft: "10px" }} className={`toggle ${filter.mosaic.scalingAspect ? "active" : ""}`}>:</button>
                  </Tooltip>
               </>}
               value={filter.mosaic.scalingNormalY}
               sliderMin={0}
               sliderMax={10}
               sliderStep={0.01}
               min={0}
               max={100}
               default={MOSAIC_DEFAULT.mosaic.scalingNormalY}
               onChange={newValue => {
                  onChange(produce(filter, v => {
                     v.mosaic.scalingNormalY = newValue
                     if (v.mosaic.scalingAspect) v.mosaic.scalingNormalX = newValue
                  }))
               }}
            />
         </>}

         {/* Blur */}
         {filter.type === "blur" && <>
            <SliderPlus
               label={<>
                  {gvar.gsm.filter.otherFilters.horizontal}
                  <Tooltip align="top" title={gvar.gsm.token.aspectLock}>
                     <button onClick={() => {
                        onChange(produce(filter, v => {
                           v.blur.aspectLock = !v.blur.aspectLock
                        }))
                     }} style={{ padding: "0px 5px", marginLeft: "10px" }} className={`toggle ${filter.blur.aspectLock ? "active" : ""}`}>:</button>
                  </Tooltip>
               </>}
               value={filter.blur.x}
               sliderMin={0}
               sliderMax={50}
               sliderStep={1}
               min={0}
               max={500}
               default={0}
               onChange={newValue => {
                  onChange(produce(filter, v => {
                     v.blur.x = newValue
                     if (v.blur.aspectLock) v.blur.y = newValue
                  }))
               }}
            />
            <SliderPlus
               label={<>
                  {gvar.gsm.filter.otherFilters.vertical}
                  <Tooltip align="top" title={gvar.gsm.token.aspectLock}>
                     <button onClick={() => {
                        onChange(produce(filter, v => {
                           v.blur.aspectLock = !v.blur.aspectLock
                        }))
                     }} style={{ padding: "0px 5px", marginLeft: "10px" }} className={`toggle ${filter.blur.aspectLock ? "active" : ""}`}>:</button>
                  </Tooltip>
               </>}
               value={filter.blur.y}
               sliderMin={0}
               sliderMax={50}
               sliderStep={1}
               min={0}
               max={500}
               default={0}
               onChange={newValue => {
                  onChange(produce(filter, v => {
                     v.blur.y = newValue
                     if (v.blur.aspectLock) v.blur.x = newValue
                  }))
               }}
            />
         </>}

         {/* Posterize  */}
         {filter.type === "posterize" && <>
            <SliderPlus
               label={gvar.gsm.filter.otherFilters.levels}
               value={filter.posterize}
               sliderMin={2}
               sliderMax={20}
               sliderStep={1}
               min={2}
               max={200}
               default={4}
               onChange={newValue => {
                  onChange(produce(filter, v => {
                     v.posterize = newValue
                  }))
               }}
            />
         </>}
      </div>
   </div>
}

const SVG_TYPE_TO_PRESET: { [key in keyof Partial<typeof SVG_FILTER_ADDITIONAL>]: {
   options: { id: string, values: any }[],
   handler: (filter: SvgFilter, onChange: (filter: SvgFilter) => void, preset: { id: string, values: any }) => void
} } = {
   mosaic: {
      options: SVG_MOSAIC_PRESETS,
      handler: (filter, onChange, preset) => {
         onChange({ ...filter, mosaic: {...filter.mosaic, ...preset.values} })
      }
   },
   colorMatrix: {
      options: SVG_COLOR_MATRIX_PRESETS,
      handler: (filter, onChange, preset) => {
         onChange({ ...filter, colorMatrix: preset.values })
      }
   }
}


