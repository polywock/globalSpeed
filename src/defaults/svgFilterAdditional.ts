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

         return formatSvgFilter(true, `${flood}${compA}${morph}`)
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

         return formatSvgFilter(false, `<feColorMatrix type="matrix" values="${matrix.map(m => m.toFixed(3)).join(" ")}"/>`)
      }
   },
   rgb: {
      format: filter => {
         const matrix = Array(20).fill(0) as number[]
         for (let i = 0; i < 3; i++) {
            matrix[i * 5 + i] = filter.rgb[i]
         }
         matrix[18] = 1 

         return formatSvgFilter(false, `<feColorMatrix type="matrix" values="${matrix.map(m => m.toFixed(3)).join(" ")}"/>`)
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
   

         return formatSvgFilter(false, `<feComponentTransfer>
               <feFuncR type="discrete" tableValues="${tableValues}"/>
               <feFuncG type="discrete" tableValues="${tableValues}"/>
               <feFuncB type="discrete" tableValues="${tableValues}"/>
            </feComponentTransfer>`)
      }
   },
   blur: {
      format: filter => {
         return formatSvgFilter(true, `<feGaussianBlur stdDeviation="${filter.blur.x} ${filter.blur.y}"/ >`)
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
         return formatSvgFilter(false, `<feConvolveMatrix order="3" kernelMatrix="${values}" edgeMode="duplicate" preserveAlpha="true"/>`)
      },
      isValid: filter => filter.sharpen > 0 
   },
   noise: {
      format: filter => {
         if (!filter.noise) return 
         const size = 1 - filter.noise.size

         return formatSvgFilter(false, `<feTurbulence id="turb" type="fractalNoise" baseFrequency="${size}" numOctaves="1" seed="0" result="n">
	         <animate attributeName="seed" values="${Array(25).fill(0).map((v, i) => i).join(';')}" dur="${1 / filter.noise.speed}s" repeatCount="indefinite"/>
         </feTurbulence>
	      <feColorMatrix type="saturate" values="0" in="n" result="gn"/>
	      <feBlend in="SourceGraphic" in2="gn" mode="${filter.noise.mode || 'multiply'}"/>`)
      },
      isValid: filter => filter.noise && filter.noise.speed !== 0 && filter.noise.size % 1 !== 0
   },
   motion: {
      format: filter => {
         const m = filter.motion
         let duration = 1 / m.speed

         let output: string[] = []
         if (m.x !== 0) output.push(`<animate attributeName="dx" values="-${m.x};${m.x};-${m.x}" dur="${duration}s" repeatCount="indefinite"/>`)
         if (m.y !== 0) output.push(`<animate attributeName="dy" values="-${m.y};${m.y};-${m.y}" dur="${duration}s" repeatCount="indefinite"/>`)

         return formatSvgFilter(false, `<feOffset dx="0" dy="0">${output.join('')}</feOffset>`)
      },
      isValid: filter => filter.motion && filter.motion.speed > 0 && (filter.motion.x > 0 || filter.motion.y > 0)
   },
   special: {
      format: filter => {
         return formatSvgFilter(true, filter.text)
      },
      isValid: filter => !!filter.text 
   }
}


function formatSvgFilter(highPadding: boolean, core: string) {
   const amount = highPadding ? 20 : 10
   return `<filter x="-${amount}%" y="-${amount}%" width="1${amount * 2}%" height="1${amount * 2}%">${core}</filter>`
}