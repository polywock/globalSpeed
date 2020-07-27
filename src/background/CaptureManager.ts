
import { MessageCallback } from "../utils/browserUtils"
import { SubClient, subscribeView } from "./GlobalState"
import { AudioFx } from "../types"
import { Jungle } from "./Jungle"
import { round } from "../utils/helper"



export class CaptureManager {
  audioCtx: AudioContext
  pitchDetector: any;
  infos: CaptureInfo[] = []
  constructor() {
    chrome.runtime.onMessage.addListener(this.handleMessage)
    chrome.runtime.onConnect.addListener(port => {
      if (!this.audioCtx) return 
      if (port.name.startsWith("ANALYZER")) {
        const data = JSON.parse(port.name.slice(9))
        if (data?.tabId == null) return 
        this.initAnalyzer(data.tabId, port)
      }
    })
  }
  initAnalyzer = (tabId: number, port: chrome.runtime.Port) => {
    const info = this.infos.find(info => info.tabId === tabId)
    if (!info || info.ana) return 
    info.ana = {
      port,
      node: this.audioCtx.createAnalyser()
    }

    info.outputNode.connect(info.ana.node)

    port.onDisconnect.addListener(port => {
      this.clearAnalyzer(info)
    })

    port.postMessage({type: "PING"})
  }
  clearAnalyzer = (info: CaptureInfo) => {
    delete info.ana
    if (!this.infos.some(info => info.ana)) {
      delete this.pitchDetector
    }
  }
  handleMessage: MessageCallback = (msg, sender, reply) => {
    if (msg.type === "TAB_CAPTURE") {
      if (msg.tabId == null) return reply(true)
      if (msg.on) {
        this.captureTab(msg.tabId)
      } else {
        this.handleToggleTab(msg.tabId)
      }
      reply(true)
    } else if (msg.type === "REQUEST_CAPTURE_STATUS") {
      chrome.runtime.sendMessage({type: "CAPTURE_STATUS", tabId: msg.tabId, value: this.infos.some(info => info.tabId === msg.tabId)})
      reply(true)
    }
  }
  handleToggleTab = (tabId: number) => {
    const info = this.infos.find(info => info.tabId === tabId)
    if (info) {
      this.releaseTab(tabId)
      return Promise.resolve(true) 
    } else {
      return this.captureTab(tabId)
    }
  }
  captureTab = async (tabId: number) => {
    if (this.infos.find(info => info.tabId === tabId)) return 
    let stream: MediaStream;
    try {
      stream = await captureTab()
    } catch (err) {
      return 
    }
    this.audioCtx = this.audioCtx || new AudioContext()

    const outputNode = this.audioCtx.createGain()
    outputNode.connect(this.audioCtx.destination)

    let info: CaptureInfo = {
      tabId,
      stream,
      streamSrc: this.audioCtx.createMediaStreamSource(stream),
      outputNode
    }

    this.infos.push(info)
    info.client = subscribeView({enabled: true, audioFx: true}, tabId, true, view => {
      this.handleChange(info, view.enabled, view.audioFx)
    })
    info.streamSrc.connect(outputNode)
    chrome.runtime.sendMessage({type: "CAPTURE_STATUS", tabId, value: true})

    
    stream.addEventListener("inactive", e => {
      this.releaseTab(tabId)
    })
  }
  releaseTab = (tabId: number) => {
    const infoIdx = this.infos.findIndex(info => info.tabId === tabId)
    if (infoIdx < 0) return 
    const info = this.infos[infoIdx]
    info.ana && this.clearAnalyzer(info)
    info.stream.getAudioTracks().forEach(track => {
      track.stop()
    })
    info.client?.release()
    this.infos.splice(infoIdx, 1)
    chrome.runtime.sendMessage({type: "CAPTURE_STATUS", tabId, value: false})

    // clear stuff 
    info.compNode?.disconnect()
    info.compGainNode?.disconnect()
    info.delayNode?.disconnect()
    info.filterNodes?.forEach(f => {
      f.disconnect()
    })
    info.jungle?.output?.disconnect()

  }
  handleChange = (info: CaptureInfo, enabled: boolean, audioFx: AudioFx) => {
    const { streamSrc } = info 
    let head: AudioNode = streamSrc
    
    streamSrc.disconnect()
    info.compNode?.disconnect()
    info.compGainNode?.disconnect()
    info.delayNode?.disconnect()
    info.filterNodes?.forEach(f => {
      f.disconnect()
    })
    info.jungle?.output?.disconnect()


    if (enabled && audioFx.pitch !== null && audioFx.pitch !== 0) {
      info.jungle = info.jungle ?? new Jungle(this.audioCtx)
      info.jungle.setPitchOffset(audioFx.pitch)
      head.connect(info.jungle.input)
      head = info.jungle.output
    } else {
      info.jungle?.release()
      delete info.jungle
    }
    


    if (enabled && audioFx.eq?.enabled && audioFx.eq.values.some(v => v !== 0)) {
      const { eq } = audioFx
      info.filterNodes = info.filterNodes || []
      const newFilterNodes: BiquadFilterNode[] = []

      const createFilter = () => {
        return info.filterNodes.shift() ?? this.audioCtx.createBiquadFilter()
      }

      const Q = 1.41 * (eq.values.length / 10)
      audioFx.eq.values.forEach((v, i) => {
        if (v === 0) return 
        v = v * (eq.factor ?? 1)
        const freq = round(31.25 * (2 ** (i / Math.round(eq.values.length / 10))), 2)
        const node = createFilter()
        newFilterNodes.push(node)

        head.connect(node)
        head = node 
        node.frequency.value = freq 
        node.gain.value = v 
        node.Q.value = Q
        if (i === 0) {
          node.type = "lowshelf"
        } else if (i === eq.values.length - 1) {
          node.type = "highshelf"
        } else {
          node.type = "peaking"
        }
      })
      delete info.filterNodes
      info.filterNodes = newFilterNodes
    } else {
      delete info.filterNodes
    }



    if (enabled && audioFx.comp?.enabled) {
      const { comp } = audioFx
      info.compNode = info.compNode ?? this.audioCtx.createDynamicsCompressor()
      info.compNode.disconnect()
      info.compNode.threshold.value = comp.threshold
      info.compNode.knee.value = comp.knee
      info.compNode.ratio.value = comp.ratio
      info.compNode.attack.value = comp.attack
      info.compNode.release.value = comp.release

      head.connect(info.compNode)
      head = info.compNode

      if (comp.gain !== 1) {
        info.compGainNode = info.compGainNode ?? this.audioCtx.createGain()
        info.compGainNode.disconnect()
        info.compGainNode.gain.value = comp.gain * comp.gain
        head.connect(info.compGainNode) 
        head = info.compGainNode
      }
    } else {
      delete info.compNode;
      delete info.compGainNode;
    }
    
    if (enabled && audioFx.volume != null && audioFx.volume !== 1) {
      info.outputNode.gain.value = audioFx.volume * audioFx.volume
    } else {
      info.outputNode.gain.value = 1
    }

    if (enabled && audioFx.delay > 0) {
      info.delayNode = info.delayNode ?? this.audioCtx.createDelay(60)
      info.delayNode.delayTime.value = audioFx.delay
      head.connect(info.delayNode)
      info.delayNode.connect(info.outputNode)
      if (audioFx.delayMerge) {
        head.connect(info.outputNode)  
      }
    } else {
      delete info.delayNode
      head.connect(info.outputNode)
    }
  }
}

export type CaptureInfo = {
  tabId: number, 
  stream: MediaStream,
  streamSrc: MediaStreamAudioSourceNode,
  outputNode: GainNode,
  client?: SubClient,
  compNode?: DynamicsCompressorNode,
  compGainNode?: GainNode,
  filterNodes?: BiquadFilterNode[],
  jungle?: Jungle,
  delayNode?: DelayNode,
  ana?: AnalyzerInfo
}

type AnalyzerInfo = {
  port: chrome.runtime.Port,
  node: AnalyserNode
}



function captureTab(): Promise<MediaStream> {
  return new Promise((res, rej) => {
    chrome.tabCapture.capture({audio: true}, stream => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError)
        return rej(chrome.runtime.lastError)
      }
      res(stream)
    })
  })
}
