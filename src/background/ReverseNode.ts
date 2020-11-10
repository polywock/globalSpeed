
export class ReverseNode extends AudioWorkletNode {
  static triedAddModule = false 
  static addedModule = false 
  static addModule = async (ctx: AudioContext) => {
    ReverseNode.triedAddModule = true 
    await ctx.audioWorklet.addModule('reverse-sound-processor.js')
    ReverseNode.addedModule = true 
  }
  endedCb: () => void
  playingCb: () => void
  ended = false 
  constructor(private ctx: AudioContext, maxDuration = 300) {
    super(ctx, 'reverse-sound-processor', {channelCount: 1, channelCountMode: "explicit", processorOptions: {maxSize: maxDuration * ctx.sampleRate}})
    this.port.onmessage = ({data}) => {
      if (data.type === "RELEASED") {
        this.ended = true 
        this.endedCb?.()
      } else if (data.type === "PLAYING") {
        this.playingCb?.()
      }
    }
  }
  forceEnd = () => {
    this.port.postMessage({type: "RELEASE"})
  }
}