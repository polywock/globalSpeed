import { assertType } from "src/utils/helper"

declare global {
  interface AudioWorkletMessage {
    RELEASED: {type: "RELEASED"}
    RELEASE: {type: "RELEASE"}
    PLAYING: {type: "PLAYING"}
  }
}

export class ReverseNode extends AudioWorkletNode {
  static addedModule = false 
  static triedAddingModule = false 
  static addModule = async (ctx: AudioContext) => {
    if (ReverseNode.addedModule) return
    if (ReverseNode.triedAddingModule) throw Error("Already failed adding module") 
    await ctx.audioWorklet.addModule('reverse-sound-processor.js')
    ReverseNode.addedModule = true 
  }
  endedCb: (tabId: number) => void
  playingCb: (tabId: number) => void
  ended = false 
  constructor(private ctx: AudioContext, private tabId: number, maxDuration = 300) {
    super(ctx, 'reverse-sound-processor', {channelCount: 1, channelCountMode: "explicit", processorOptions: {maxSize: maxDuration * ctx.sampleRate}})
    this.port.onmessage = ({data}) => {
      assertType<AudioWorkletMessages>(data)
      if (data.type === "RELEASED") {
        this.ended = true 
        this.endedCb?.(this.tabId)
      } else if (data.type === "PLAYING") {
        this.playingCb?.(this.tabId)
      }
    }
  }
  forceEnd = () => {
    if (this.ended) return 
    this.port.postMessage({type: "RELEASE"} as AudioWorkletMessages)
  }
}