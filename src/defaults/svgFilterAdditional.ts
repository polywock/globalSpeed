import { SvgFilter } from "src/types"
import { SvgFilterName } from "./filters"
import { lerp } from "src/utils/helper"

export const SVG_FILTER_ADDITIONAL: { [key in SvgFilterName]: {
   format: (filter: SvgFilter) => string,
   isValid?: (filter: SvgFilter) => boolean
} } = {
   mosaic: {
      format: filter => {
         const init = filter.mosaic

         // All should be odd.
         let blockX = Math.round(2 * init.blockX - 1)
         let blockY = Math.round(2 * init.blockY - 1)

         let sampleX = Math.round(lerp(1, blockX, init.sampleNormalX))
         if (sampleX % 2 === 0) sampleX = Math.round(sampleX + 1) 

         let sampleY = Math.round(lerp(1, blockY, init.sampleNormalY))
         if (sampleY % 2 === 0) sampleY = Math.round(sampleY + 1) 

         const morphIdealX = Math.round((blockX - sampleX) / 2)
         const morphIdealY = Math.round((blockY - sampleY) / 2)
         
         const morphX = Math.round(morphIdealX * init.scalingNormalX)
         const morphY = Math.round(morphIdealY * init.scalingNormalY)

         let flood = `<feFlood flood-color="red" x="0" y="0" width="${sampleX}" height="${sampleY}"/> `
         let compA = `<feComposite width="${blockX}" height="${blockY}"/><feTile result="a"/><feComposite in="SourceGraphic" in2="a" operator="in"/>`
         let morph = `<feMorphology operator="dilate" radius="${morphX} ${morphY}"></feMorphology>`

         return `<filter x="-20%" y="-20%" width="140%" height="140%">${flood}${compA}${morph}</filter>`
      }
   },
   custom: {
      format: filter => {
         return filter.text
      }
   },
   colorMatrix: {
      format: filter => {
         const matrix = Array(20).fill(0) as number[]
         for (let i = 0; i < 3; i++) {
            matrix[i * 5 + 0] = filter.colorMatrix[i * 4 + 0]
            matrix[i * 5 + 1] = filter.colorMatrix[i * 4 + 1]
            matrix[i * 5 + 2] = filter.colorMatrix[i * 4 + 2]
            matrix[i * 5 + 4] = filter.colorMatrix[i * 4 + 3]
         }
         matrix[18] = 1 

         return `<filter x="-20%" y="-20%" width="140%" height="140%">
            <feColorMatrix type="matrix" values="${matrix.map(m => m.toFixed(3)).join(" ")}"/>
         </filter>`
      }
   },
   rgb: {
      format: filter => {
         const matrix = Array(20).fill(0) as number[]
         for (let i = 0; i < 3; i++) {
            matrix[i * 5 + i] = filter.rgb[i]
         }
         matrix[18] = 1 

         return `<filter x="-20%" y="-20%" width="140%" height="140%">
            <feColorMatrix type="matrix" values="${matrix.map(m => m.toFixed(3)).join(" ")}"/>
         </filter>`
      },
      isValid: filter => {
         return filter.rgb && (filter.rgb[0] !== 1 || filter.rgb[1] !== 1 || filter.rgb[2] !== 1)
      }
   },
   posterize: {
      format: filter => {
         if (!filter.posterize) return
         const steps = Math.round(filter.posterize - 1)
         const values = Array(steps).fill(0).map((v, i) => (i / steps).toFixed(4))
         values.push(`1.0`)
         const tableValues = values.join(" ")
   

         return `<filter x="-20%" y="-20%" width="140%" height="140%">
            <feComponentTransfer>
               <feFuncR type="discrete" tableValues="${tableValues}"/>
               <feFuncG type="discrete" tableValues="${tableValues}"/>
               <feFuncB type="discrete" tableValues="${tableValues}"/>
            </feComponentTransfer>
         </filter>`
      }
   },
   blur: {
      format: filter => {
         return `<filter x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="${filter.blur.x} ${filter.blur.y}"/ >
         </filter>`
      },
      isValid: filter => {
         return filter.blur.x > 0 || filter.blur.y > 0
      }
   },
   sharpen: {
      format: filter => {
         if (!filter.sharpen) return 
         const neg = `-${filter.sharpen.toFixed(2)}`
         const center = (1 + 4 * filter.sharpen).toFixed(6)
         const values = `0 ${neg} 0 ${neg} ${center} ${neg} 0 ${neg} 0`
         return `<filter x="-10%" y="-10%" width="120%" height="120%"><feConvolveMatrix order="3" kernelMatrix="${values}" edgeMode="duplicate" preserveAlpha="true"/></filter>`
      },
      isValid: filter => filter.sharpen > 0 
   },
   special: {
      format: filter => {
         return `<filter x="-20%" y="-20%" width="140%" height="140%">${filter.text}</filter>`
      },
      isValid: filter => !!filter.text 
   }
}

