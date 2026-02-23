import { SoundTouch } from "soundtouchjs"
import { assertType } from "@/utils/helper"

declare global {
	interface AudioWorkletMessage {
		RELEASE: { type: "RELEASE" }
	}
}

class SoundTouchProcessor extends AudioWorkletProcessor {
	// AudioParamDescriptor
	static get parameterDescriptors(): any[] {
		return [
			{
				name: "semitone",
				defaultValue: 0,
				automationRate: "k-rate",
			},
		]
	}

	soundTouch = new SoundTouch()
	filter = new LiveFilter(this.soundTouch)
	semitone: number
	outputBuffer: Float32Array
	released: boolean

	constructor() {
		super()
		this.port.onmessage = ({ data }) => {
			assertType<AudioWorkletMessages>(data)
			if (data.type === "RELEASE") {
				this.released = true
				delete this.soundTouch
				delete this.filter
			}
		}
	}

	process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
		if (this.released) return false

		const input = inputs[0]
		const output = outputs[0]

		if (!input[0]) return true

		const frameCount = input[0].length
		const dualChannel = input.length > 1

		const semitone = parameters.semitone[0] ?? 0
		if (this.semitone !== semitone) {
			this.soundTouch.pitchSemitones = semitone
			this.semitone = semitone
		}

		if (this.semitone === 0) {
			for (let c = 0; c < input.length; c++) {
				output[c].set(input[c])
			}

			return true
		}

		this.outputBuffer = this.outputBuffer?.length === 2 * frameCount ? this.outputBuffer : new Float32Array(2 * frameCount)

		this.filter.push(input[0], input[1] || input[0])
		this.filter.extract(this.outputBuffer, frameCount)

		if (dualChannel) {
			for (let i = 0; i < frameCount; i++) {
				output[0][i] = this.outputBuffer[2 * i] || 0
				output[1][i] = this.outputBuffer[2 * i + 1] || 0
			}
		} else {
			for (let i = 0; i < frameCount; i++) {
				output[0][i] = this.outputBuffer[2 * i] || 0
			}
		}

		return true
	}
}

class LiveFilter {
	constructor(private _pipe: any) {}
	push(left: Float32Array, right: Float32Array) {
		const samples = new Float32Array(left.length * 2)
		for (let i = 0; i < left.length; i++) {
			samples[i * 2] = left[i]
			samples[i * 2 + 1] = right[i]
		}
		this._pipe.inputBuffer.putSamples(samples, 0, left.length)
	}

	extract(target: Float32Array, numFrames = 0, minFrames = 8192) {
		if (this._pipe.inputBuffer.frameCount >= minFrames) {
			this._pipe.process()
		}
		this._pipe.outputBuffer.receiveSamples(target, numFrames)
	}
}

registerProcessor("sound-touch-processor", SoundTouchProcessor)
