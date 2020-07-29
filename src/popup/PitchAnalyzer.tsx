import { useEffect, useRef, useState } from "react";
import { inverseLerp } from "../utils/helper";
import { CaptureInfo } from "../background/CaptureManager"
import React from "react"

const SAMPLE_RATE = 1 / 30

export function PitchAnalyzer(props: {}) {
  const [freqMode, setFreqMode] = useState(false)
  const ref = useRef<HTMLCanvasElement>()
  
  useEffect(() => {
    const canvas = ref.current as HTMLCanvasElement
    const ctx = canvas.getContext("2d")
    let signalView: SignalView
    chrome.runtime.getBackgroundPage(bgPage => {
      signalView = new SignalView(ctx, bgPage, freqMode)
    })
    
    return () => {
      signalView.release()
      signalView = null 
    }
  }, [freqMode])

  return <canvas onClick={e => setFreqMode(!freqMode)} style={{width: "100%", height: "125px"}} ref={ref}/>
}


class SignalView {
  canvas = this.ctx.canvas 
  port = chrome.runtime.connect({name: `ANALYZER ${JSON.stringify({tabId: window.tabInfo.tabId, sampleRate: SAMPLE_RATE})}`})
  buffer: Float32Array
  intervalId: number
  MIN_DB: number
  MAX_DB: number
  info: CaptureInfo
  FFT_SIZE: number 
  constructor(public ctx: CanvasRenderingContext2D, public bgPage: Window, private freqMode: boolean) {
    
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

    this.FFT_SIZE = this.freqMode ? 256 : 1024 
    info.ana.node.fftSize = this.FFT_SIZE
    this.buffer = new Float32Array(this.freqMode ? info.ana.node.frequencyBinCount : this.FFT_SIZE)
    this.MIN_DB = info.ana.node.minDecibels
    this.MAX_DB = info.ana.node.maxDecibels
  
    this.intervalId = setInterval(this.handleInterval, SAMPLE_RATE * 1000)
  }
  release = () => {
    this.port.disconnect()
    clearInterval(this.intervalId)
  }
  handleInterval = () => {
    const info = this.info
    if (info?.ana?.node) {
      if (this.freqMode) {
        info.ana.node.getFloatFrequencyData(this.buffer)
      } else {
        info.ana.node.getFloatTimeDomainData(this.buffer)
      }
    }
    
    this.draw()
  }
  draw = () => {
    const { ctx, canvas } = this 
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (this.freqMode) {
      this.drawFreq()
    } else {
      this.drawSignal()
    }
  }
  drawSignal = () => {
    const { ctx, buffer } = this 
    ctx.beginPath()
    ctx.strokeStyle = "yellow"
    ctx.lineWidth = 2 
    for (let i = 0; i < buffer.length; i++) {
      const x = i / buffer.length * ctx.canvas.width
      const y = inverseLerp(0.75, -0.75, buffer[i]) * ctx.canvas.height
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  drawFreq = () => {
    const { ctx, buffer } = this 
    ctx.beginPath()
    ctx.strokeStyle = "yellow"
    ctx.lineWidth = 2

    const binWidth = ctx.canvas.width / buffer.length

    for (let i = 0; i < buffer.length; i++) {
      const x = (i + 0.5) * binWidth
      const y = inverseLerp(this.MAX_DB, this.MIN_DB, buffer[i]) * ctx.canvas.height
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

