
import { MessageCallback } from "../utils/browserUtils"
import { SubClient, subscribeView } from "./GlobalState"
import { AudioFx } from "../types"
import { Jungle } from "./Jungle"
import { round, clamp } from "../utils/helper"
import { SoundTouchNode } from "./SoundTouchNode"
import { sendMediaEvent } from "../utils/configUtils"
import { ReverseNode } from "./ReverseNode"


export class CaptureManager {
  audioCtx: AudioContext
  infos: CaptureInfo[] = []
  constructor() {
    chrome.runtime.onMessage.addListener(this.handleMessage)
    chrome.runtime.onConnect.addListener(port => {
      if (port.name.startsWith("REVERSE")) {
        const data = JSON.parse(port.name.slice(8))
        if (data?.tabId == null) return 
        this.initReverse(data.tabId, port)
      } 
    })
  }
  initReverse = async (tabId: number, port: chrome.runtime.Port) => {
    let info = this.infos.find(info => info.tabId === tabId)
    if (info?.reverse) return 

    if (!info) {
      try {
        await this.captureTab(tabId)
      } catch (err) {
        port.disconnect()
      }
    }

    info = this.infos.find(info => info.tabId === tabId)

    info || port.disconnect()

    if (!ReverseNode.triedAddModule) {
      try {
        await ReverseNode.addModule(this.audioCtx)
      } catch (err) {
        port.disconnect()
      }
    }

    let deferCbs: (() => void)[] = [] 

    const node = new ReverseNode(this.audioCtx)

    node.playingCb = () => {
      for (let scope of window.globalMedia.scopes) {
        if (scope.tabInfo.tabId !== tabId) continue 

        for (let media of scope.media) {
          if (!(!media.paused && media.volume)) continue 

          sendMediaEvent({type: "PAUSE", state: "on"}, media.key, tabId, scope.tabInfo.frameId)

          deferCbs.push(() => {
            sendMediaEvent({type: "PAUSE", state: "off"}, media.key, tabId, scope.tabInfo.frameId)
          })

        }
      }
      
      port.postMessage({type: "PLAYING"})
    }

    node.endedCb = () => {
      port.disconnect()
    
      handleDisconnect()
    }

    port.onMessage.addListener(msg => {
      if (msg.type === "PLAY") {
        info.outputNode.disconnect(node)
      }
    })

    const handleDisconnect = () => {
      if (!info.reverse) return 
      delete info.reverse

      // connect output back to speaker 
      info.outputNode.connect(this.audioCtx.destination)

      // ensure no outgoing connections 
      node.disconnect()

      // ensure output not connected to node. 
      try {
        info.outputNode.disconnect(node)
      } catch (err) {}

      if (!node.ended) {
        node.forceEnd()

      }

      deferCbs.forEach(cb => {
        cb()
      })
    }

    info.reverse = handleDisconnect

    port.onDisconnect.addListener(handleDisconnect)

    info.outputNode.disconnect(this.audioCtx.destination)
    info.outputNode.connect(node)
    node.connect(this.audioCtx.destination)
  }
  handleMessage: MessageCallback = (msg, sender, reply) => {
    if (msg.type === "TAB_CAPTURE") {
      if (msg.tabId == null) return reply(true)
      if (msg.on) {
        this.captureTab(msg.tabId)
      } else if (msg.on === false) {
        this.releaseTab(msg.tabId)
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
    this.audioCtx = this.audioCtx || new AudioContext({sampleRate: 44100, latencyHint: 0})

    const outputNode = this.audioCtx.createGain()
    outputNode.connect(this.audioCtx.destination)

    let info: CaptureInfo = {
      tabId,
      stream,
      streamSrc: this.audioCtx.createMediaStreamSource(stream),
      outputNode
    }

    this.infos.push(info)
    info.client = subscribeView({superDisable: true, enabled: true, audioFx: true, audioFxAlt: true, monoOutput: true}, tabId, true, view => {
      this.handleChange(info, view.enabled, view.audioFx, view.audioFxAlt, view.monoOutput)

      if (view.superDisable) {
        this.releaseTab(info.tabId)
      }
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

    info.reverse?.()

    info.client.release()
    info.stream.getAudioTracks().forEach(track => {
      track.stop()
    })
    delete info.stream 
    info.client?.release()
    this.infos.splice(infoIdx, 1)
    info.fx?.release(); delete info.fx 
    info.outputNode?.disconnect(); delete info.outputNode
    info.streamSrc.disconnect(); delete info.streamSrc

    chrome.runtime.sendMessage({type: "CAPTURE_STATUS", tabId, value: false})
  }
  handleChange = (info: CaptureInfo, enabled: boolean, audioFx: AudioFx, audioFxAlt: AudioFx, monoOutput: boolean) => {
    const { streamSrc } = info 
    
    streamSrc.disconnect()
    info.fx = info.fx || new AudioEffectComplex(this.audioCtx)
    
    info.fx.updateFx(enabled, audioFx, audioFxAlt, monoOutput)

    streamSrc.connect(info.fx.input)
    info.fx.output.connect(info.outputNode)
  }
}

export type CaptureInfo = {
  tabId: number, 
  stream: MediaStream,
  streamSrc: MediaStreamAudioSourceNode,
  outputNode: GainNode,
  client?: SubClient,
  fx?: AudioEffectComplex
  reverse?: () => void,
}


function captureTab(): Promise<MediaStream> {
  return new Promise((res, rej) => {
    chrome.tabCapture.capture({audio: true}, stream => {
      if (chrome.runtime.lastError) {
        return rej(chrome.runtime.lastError)
      }
      res(stream)
    })
  })
}

class AudioEffectComplex {
  input: GainNode
  output: GainNode
  main?: AudioEffect
  alt?: AudioEffect
  splitter?: ChannelSplitterNode
  merger?: ChannelMergerNode
  pan?: StereoPannerNode

  constructor(public ctx: AudioContext) {
    this.input = ctx.createGain()
    this.output = ctx.createGain()
  }
  release = () => {
    this.estrange()
    this.main?.release()
    this.alt?.release()
  }
  updateFx = async (enabled: boolean, audioFx: AudioFx, audioFxAlt: AudioFx, monoOutput: boolean) => {
    
    let head = this.input as AudioNode
    this.estrange()


    this.main = this.main || new AudioEffect(this.ctx)
    this.main.updateFx(enabled, audioFx, !!audioFxAlt)


    if (enabled && audioFxAlt) {
      head.channelCount = 2
      head.channelCountMode = "explicit"

      this.splitter = this.splitter || this.ctx.createChannelSplitter(2)
      head.connect(this.splitter) 

      this.alt = this.alt || new AudioEffect(this.ctx)
      this.alt.updateFx(enabled, audioFxAlt)

      this.splitter.connect(this.main.input, 0)
      this.splitter.connect(this.alt.input, 1)

      this.merger = this.merger || this.ctx.createChannelMerger(2)
      this.main.output.connect(this.merger, undefined, 0)
      this.alt.output.connect(this.merger, undefined, 1)
      head = this.merger
    
    } else {
      head.channelCountMode = "max"
      this.alt?.release();
      delete this.alt
      delete this.splitter
      delete this.merger

      head.connect(this.main.input)
      head = this.main.output
    }

    if (enabled && audioFx.pan) {
      this.pan = this.pan || this.ctx.createStereoPanner()
      this.pan.pan.value = clamp(-1, 1, audioFx.pan || 0)

      head.connect(this.pan)
      head = this.pan 
    } else {
      this.pan?.disconnect(); delete this.pan
    }

    head.connect(this.output)
    head = this.output
    
    if (enabled && monoOutput) {
      head.channelCount = 1 
      head.channelCountMode = "clamped-max"
    } else {
      head.channelCountMode = "max"
    }
  }
  estrange = () => {
    this.input.disconnect()
    this.main?.output.disconnect()
    this.alt?.output.disconnect()
    this.splitter?.disconnect()
    this.merger?.disconnect()
    this.pan?.disconnect()
  }
}


class AudioEffect {
  input: GainNode
  output: GainNode

  filterNodes?: BiquadFilterNode[]
  jungle?: Jungle
  soundTouchNode?: SoundTouchNode
  delayNode?: DelayNode

  constructor(public ctx: AudioContext) {
    this.input = ctx.createGain()
    this.output = ctx.createGain()
  }
  release = () => {
    this.estrange()
    this.jungle?.release()
    this.soundTouchNode?.release()
    delete this.jungle
  }
  prevUpdateFx: () => void 
  updateFx = async (enabled: boolean, audioFx: AudioFx, hasAlt?: boolean) => {
    this.prevUpdateFx = () => this.updateFx(enabled, audioFx)
    this.estrange()

    let head = this.input as AudioNode
    
    // jungle pitch
    if (enabled && audioFx.jungleMode && audioFx.pitch !== null && audioFx.pitch !== 0) {
      this.jungle = this.jungle ?? new Jungle(this.ctx)
      this.jungle.setPitchOffset(audioFx.pitch)
      head.connect(this.jungle.input)
      head = this.jungle.output
    } else {
      this.jungle?.release()
      delete this.jungle
    }


    // soundtouch pitch
    const soundTouchActive = enabled && !audioFx.jungleMode && audioFx.pitch !== null && audioFx.pitch !== 0

    // try adding module.
    if (!SoundTouchNode.triedAddModule && soundTouchActive) {
      try {
        await SoundTouchNode.addModule(this.ctx)
      } catch (err) {}
    }


    if (SoundTouchNode.addedModule && soundTouchActive) {

      if (!this.soundTouchNode) {
        this.soundTouchNode = new SoundTouchNode(this.ctx)
        this.soundTouchNode.onprocessorerror = (err) => {
          console.error("SoundTouchProcessor error: ", err)
          this.soundTouchNode?.release()
          delete this.soundTouchNode
          SoundTouchNode.addedModule = false
          SoundTouchNode.triedAddModule = true 
          this.prevUpdateFx()
        }
      }

      this.soundTouchNode.update(audioFx.pitch)

      head.connect(this.soundTouchNode)
      head = this.soundTouchNode
    } else {
      this.soundTouchNode?.release()
      delete this.soundTouchNode
    }
    

    // eq
    if (enabled && audioFx.eq?.enabled && audioFx.eq.values.some(v => v !== 0)) {
      const { eq } = audioFx
      this.filterNodes = this.filterNodes || []
      const newFilterNodes: BiquadFilterNode[] = []

      const createFilter = () => {
        return this.filterNodes.shift() ?? this.ctx.createBiquadFilter()
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
      delete this.filterNodes
      this.filterNodes = newFilterNodes
    } else {
      delete this.filterNodes
    }

    // delay
    let secondHead: AudioNode;
    if (enabled && audioFx.delay > 0) {
      this.delayNode = this.delayNode ?? this.ctx.createDelay(10)
      if (audioFx.delay > this.delayNode.delayTime.maxValue) {
        this.delayNode = this.ctx.createDelay(179.99)
      }
      this.delayNode.delayTime.value = clamp(0, this.delayNode.delayTime.maxValue, audioFx.delay)

      if (audioFx.delayMerge) {
        secondHead = head 
      }
    
      head.connect(this.delayNode)
      head = this.delayNode
    } else {
      delete this.delayNode
    }

    head.connect(this.output)
    secondHead && secondHead.connect(this.output)  

    // gain
    if (enabled && audioFx.volume != null && audioFx.volume !== 1) {
      this.output.gain.value = audioFx.volume * audioFx.volume
    } else {
      this.output.gain.value = 1
    }
  }
  estrange = () => {
    this.input.disconnect()
    this.delayNode?.disconnect()
    this.filterNodes?.forEach(f => {
      f.disconnect()
    })
    this.jungle?.output?.disconnect()
    this.soundTouchNode?.disconnect()
  }
}