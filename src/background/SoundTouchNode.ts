
export class SoundTouchNode extends AudioWorkletNode {
  static triedAddModule = false 
  static addedModule = false 
  static addModule = async (ctx: AudioContext) => {
    SoundTouchNode.triedAddModule = true 
    await ctx.audioWorklet.addModule('sound-touch-processor.js')
    SoundTouchNode.addedModule = true 
  }
  constructor(private ctx: AudioContext) {
    super(ctx, 'sound-touch-processor', {channelCount: 2, channelCountMode: "clamped-max"})
    
    if (this.ctx.sampleRate !== 44100) {
      console.warn("Audio context sample rate should be 44100.")
    }
  }
  release = () => {
    this.port.postMessage({type: "RELEASE"})
  }
  update = (semitone: number) => {
    this.parameters.get("semitone").value = semitone
  }
}