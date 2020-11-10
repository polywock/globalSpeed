
const DELAY_DURATION = 0.1
const FADE_DURATION = 0.05
const BUFFER_DURATION = 0.1

// From Chris Wilson --- https://github.com/cwilso/Audio-Input-Effects/blob/master/js/jungle.js
// Refactored slightly.
export class Jungle {
  input: AudioNode
  output: AudioNode
  mod1Gain: GainNode
  mod2Gain: GainNode
  mod3Gain: GainNode
  mod4Gain: GainNode
  modGain1: GainNode
  modGain2: GainNode
  mod1: AudioBufferSourceNode
  mod2: AudioBufferSourceNode
  mod3: AudioBufferSourceNode
  mod4: AudioBufferSourceNode
  fade1: AudioBufferSourceNode
  fade2: AudioBufferSourceNode
  constructor(public ctx: AudioContext) {
    const cached = Jungle.getCache(ctx)

    // entry nodes 
    this.input = ctx.createGain()
    this.output = ctx.createGain()

    // Delay modulation.
    this.mod1 = ctx.createBufferSource()
    this.mod2 = ctx.createBufferSource()
    this.mod3 = ctx.createBufferSource()
    this.mod4 = ctx.createBufferSource()
    this.mod1.buffer = cached.down
    this.mod2.buffer = cached.down
    this.mod3.buffer = cached.up
    this.mod4.buffer = cached.up
    this.mod1.loop = true
    this.mod2.loop = true
    this.mod3.loop = true
    this.mod4.loop = true

    // for switching between oct-up and oct-down
    this.mod1Gain = ctx.createGain()
    this.mod2Gain = ctx.createGain()
    this.mod3Gain = ctx.createGain()
    this.mod3Gain.gain.value = 0
    this.mod4Gain = ctx.createGain()
    this.mod4Gain.gain.value = 0

    this.mod1.connect(this.mod1Gain)
    this.mod2.connect(this.mod2Gain)
    this.mod3.connect(this.mod3Gain)
    this.mod4.connect(this.mod4Gain)

    // Delay amount for changing pitch.
    this.modGain1 = ctx.createGain()
    this.modGain2 = ctx.createGain()

    const delay1 = ctx.createDelay(5)
    const delay2 = ctx.createDelay(5)
    this.mod1Gain.connect(this.modGain1)
    this.mod2Gain.connect(this.modGain2)
    this.mod3Gain.connect(this.modGain1)
    this.mod4Gain.connect(this.modGain2)
    this.modGain1.connect(delay1.delayTime)
    this.modGain2.connect(delay2.delayTime)

    // Crossfading.
    this.fade1 = ctx.createBufferSource()
    this.fade2 = ctx.createBufferSource()
    var fadeBuffer = cached.fade
    this.fade1.buffer = fadeBuffer
    this.fade2.buffer = fadeBuffer
    this.fade1.loop = true
    this.fade2.loop = true

    const mix1 = ctx.createGain()
    const mix2 = ctx.createGain()
    mix1.gain.value = 0
    mix2.gain.value = 0

    this.fade1.connect(mix1.gain)
    this.fade2.connect(mix2.gain)

    // Connect processing graph.
    this.input.connect(delay1)
    this.input.connect(delay2)
    delay1.connect(mix1)
    delay2.connect(mix2)
    mix1.connect(this.output)
    mix2.connect(this.output)

    // Start
    var t = ctx.currentTime + 0.050
    var t2 = t + BUFFER_DURATION - FADE_DURATION
    this.mod1.start(t)
    this.mod2.start(t2)
    this.mod3.start(t)
    this.mod4.start(t2)
    this.fade1.start(t)
    this.fade2.start(t2)

    this.setDelay(DELAY_DURATION)
  }
  release = () => {
    this.fade1.stop()
    this.fade1.stop()
    this.mod1.stop()
    this.mod2.stop()
    this.mod3.stop()
    this.mod4.stop()
    this.input.disconnect()
    this.output.disconnect()
    Jungle.releaseCached()
  }
  setDelay = (delayTime: number) => {
    this.modGain1.gain.setTargetAtTime(0.5*delayTime, this.ctx.currentTime, 0.010)
    this.modGain2.gain.setTargetAtTime(0.5*delayTime, this.ctx.currentTime, 0.010)
  }
  setPitchOffset = (mult: number) => {
    mult = semitoneToMult(mult)
    
    if (mult > 0) { // pitch up
        this.mod1Gain.gain.value = 0
        this.mod2Gain.gain.value = 0
        this.mod3Gain.gain.value = 1
        this.mod4Gain.gain.value = 1
    } else { // pitch down
        this.mod1Gain.gain.value = 1
        this.mod2Gain.gain.value = 1
        this.mod3Gain.gain.value = 0
        this.mod4Gain.gain.value = 0
    }
    this.setDelay(DELAY_DURATION*Math.abs(mult))
  }


  static cached: {
    up: AudioBuffer,
    down: AudioBuffer,
    fade: AudioBuffer,
    references: number
  }
  static getCache(ctx: AudioContext) {
    if (!Jungle.cached) {
      Jungle.cached = {
        down: createDelayTimeBuffer(ctx, false),
        up: createDelayTimeBuffer(ctx, true),
        fade: createFadeBuffer(ctx),
        references: 0
      }
    }
    Jungle.cached.references++
    return Jungle.cached
  }
  static releaseCached() {
    if (!Jungle.cached) return 
    Jungle.cached.references-- 
    if (Jungle.cached.references <= 0) {
      delete Jungle.cached
    }
  }
}


function createFadeBuffer(context: AudioContext) {
  var length1 = BUFFER_DURATION * context.sampleRate
  var length2 = (BUFFER_DURATION - 2 * FADE_DURATION) * context.sampleRate
  var length = length1 + length2
  var buffer = context.createBuffer(1, length, context.sampleRate)
  var p = buffer.getChannelData(0)

  var fadeLength = FADE_DURATION * context.sampleRate

  var fadeIndex1 = fadeLength
  var fadeIndex2 = length1 - fadeLength

  // 1st part of cycle
  for (var i = 0; i < length1; ++i) {
      var value

      if (i < fadeIndex1) {
          value = Math.sqrt(i / fadeLength)
      } else if (i >= fadeIndex2) {
          value = Math.sqrt(1 - (i - fadeIndex2) / fadeLength)
      } else {
          value = 1
      }

      p[i] = value
  }

  // 2nd part
  for (var i = length1; i < length; ++i) {
    p[i] = 0
  }


  return buffer
}

function createDelayTimeBuffer(ctx: AudioContext, shiftUp: boolean) {
  var length1 = BUFFER_DURATION * ctx.sampleRate
  var length2 = (BUFFER_DURATION - 2 * FADE_DURATION) * ctx.sampleRate
  var length = length1 + length2
  var buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  var p = buffer.getChannelData(0)

  // 1st part of cycle
  for (var i = 0; i < length1; ++i) {
      if (shiftUp)
        // This line does shift-up transpose
        p[i] = (length1-i)/length
      else
        // This line does shift-down transpose
        p[i] = i / length1
  }

  // 2nd part
  for (var i = length1; i < length; ++i) {
    p[i] = 0
  }

  return buffer
}


// polywock: took me a while to figure out, but seems to work.
function semitoneToMult(semitone: number){
  return Math.pow(2, 1 + (1 / 12 * semitone)) - 2
}