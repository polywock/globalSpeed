import { useEffect, useRef, useState } from "react";
import { freqToLinear, inverseLerp, linearToChromatic } from "../utils/helper";
import { CaptureInfo } from "../background/CaptureManager"
import { PitchDetector } from "pitchy"

const SAMPLE_RATE = 1 / 30

export function PitchAnalyzer(props: {}) {
  const [pitchMode, setPitchMode] = useState(false)
  const ref = useRef<HTMLCanvasElement>()
  const env = useRef({} as {signal: SignalView}).current
  
  useEffect(() => {
    const canvas = ref.current as HTMLCanvasElement
    const ctx = canvas.getContext("2d")
    chrome.runtime.getBackgroundPage(bgPage => {
      env.signal = new SignalView(ctx, bgPage)
    })
    
    return () => {
      if (env.signal) {
        env.signal.release()
        env.signal = null 
      }
    }
  }, [])

  useEffect(() => {
    if (!env.signal) return 
    env.signal.showPitch = pitchMode
    env.signal.update()
  }, [pitchMode])

  return <canvas onClick={e => setPitchMode(!pitchMode)} style={{width: "100%", height: "125px"}} ref={ref}/>
}


class SignalView {
  canvas = this.ctx.canvas 
  port = chrome.runtime.connect({name: `ANALYZER ${JSON.stringify({tabId: window.tabInfo.tabId})}`})
  buffer: Float32Array
  intervalId: number
  info: CaptureInfo
  FFT_SIZE: number 
  detector: any
  constructor(public ctx: CanvasRenderingContext2D, public bgPage: Window, public showPitch = false) {
    this.port.onMessage.addListener(msg => {
      if (msg.type === "PING") {
        this.handleAnalyzerCreated()
      }
    })
  }
  handleAnalyzerCreated = () => {

    const info = this.bgPage.captureMgr.infos.find(info => info.tabId === window.tabInfo.tabId)
    this.info = info 

    
    if (!info || !info.ana) {
      this.release()
      return 
    }

    this.update()

    this.intervalId = setInterval(this.handleInterval, SAMPLE_RATE * 1000)
  }
  release = () => {
    this.port.disconnect()
    clearInterval(this.intervalId)
  }
  update = () => {
    const { showPitch } = this
    this.FFT_SIZE = showPitch ? 1024 : 256 
    this.info.ana.node.fftSize = this.FFT_SIZE
    this.detector = showPitch ? (this.detector || PitchDetector.forFloat32Array(this.FFT_SIZE)) : null 
    this.buffer = this.buffer?.length !== this.FFT_SIZE ? new Float32Array(this.FFT_SIZE) : this.buffer
  }
  handleInterval = () => {
    const info = this.info
    if (info?.ana?.node) {
      info.ana.node.getFloatTimeDomainData(this.buffer)
    }
    
    this.draw()
  }
  draw = () => {
    const { ctx, buffer, canvas } = this 
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.beginPath()
    ctx.strokeStyle = "yellow"
    ctx.lineWidth = 2 

    const offset = buffer.length - 256 
    for (let i = offset; i < buffer.length; i++) {
      const x = (i - offset) / 256 * ctx.canvas.width
      const y = inverseLerp(0.75, -0.75, buffer[i]) * ctx.canvas.height
      ctx.lineTo(x, y)
    }
    ctx.stroke()

    if (!this.showPitch) return 

    let [pitch, clarity] = this.detector.findPitch(this.buffer, 44100);
    ctx.fillStyle = "white"
    ctx.font = '20px monospace';
    ctx.textBaseline = "top"
    
    if (clarity > 0.5) {
      ctx.textAlign = "left"
      ctx.fillText(`${linearToChromatic(freqToLinear(pitch)).padEnd(2, " ")}`, 8, 15)

      ctx.textAlign = "right"
      ctx.fillText(`${pitch.toFixed(0)}`, canvas.width - 8, 15)
    }
  }
}

