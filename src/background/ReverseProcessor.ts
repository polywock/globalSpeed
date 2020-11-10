
class ReverseProcessor extends AudioWorkletProcessor {
  buffer = new Float32Array(44100 * 10)
  recordSize = 0
  playSize = 0
  maxBufferSize: number 
  phase = Phase.pre

  constructor(init: AudioWorkletNodeOptions) {
    super()
    this.maxBufferSize = init.processorOptions.maxSize || 44100 * 60

    this.port.onmessage = ({data}) => {
      if (data.type === "RELEASE") {
        this.release()
      } 
    }
  }
  release = () => {
    if (this.phase !== Phase.released) {
      this.phase = Phase.released
      this.port.postMessage({type: "RELEASED"})
    }
  }
  
  process (inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
    if (this.phase === Phase.released) return false 

    const input = inputs[0]
    const output = outputs[0]

    const batchSize = output[0].length

    if (this.phase === Phase.pre) {
      if (input[0]) {
        this.phase = Phase.recording
      } else {
        return true 
      }
    }

    if (this.phase ===  Phase.recording) {
      if (!input[0]) {
        this.phase = Phase.playing
        this.buffer.subarray(0, this.recordSize).reverse()
        this.port.postMessage({type: "PLAYING"})
      } else {
        const newBufferSize = this.recordSize + batchSize
        if (newBufferSize > this.maxBufferSize)  {
          this.phase = Phase.playing
          this.buffer.subarray(0, this.recordSize).reverse()
          this.port.postMessage({type: "PLAYING"})
        } else {

          // might need to enlarge buffer. 
          if (newBufferSize > this.buffer.length) {
           const biggerBuffer = new Float32Array(this.buffer.length * 2)
           biggerBuffer.set(this.buffer)
           this.buffer = biggerBuffer
          }

          
          this.buffer.set(input[0], this.recordSize)
          this.recordSize = newBufferSize
        }
      }
    }

    if (this.phase === Phase.playing) {
      if (this.playSize < this.recordSize) {
        output[0].set(this.buffer.subarray( this.playSize, this.playSize + batchSize))
        this.playSize += batchSize
        return true 
      } else {
        this.release()
        return false 
      }
    }

    output[0].set(input[0])

    return true 
  }
}

enum Phase {
  "pre" = 1,
  "recording",
  "playing",
  "released"
}

registerProcessor('reverse-sound-processor', ReverseProcessor)