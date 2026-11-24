// Lowers bit depth (quantizes each sample) and sample rate (holds each sample for `downsample` frames).
class BitCrusherProcessor extends AudioWorkletProcessor {
	static get parameterDescriptors() {
		return [
			{ name: "bits", defaultValue: 8, minValue: 1, maxValue: 16, automationRate: "k-rate" },
			{ name: "downsample", defaultValue: 4, minValue: 1, maxValue: 40, automationRate: "k-rate" },
		]
	}
	held: number[] = []
	phase: number[] = []

	process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
		const input = inputs[0]
		const output = outputs[0]
		// Samples span -1 to 1, so n bits leave 2^n levels across that range.
		const step = 2 ** (1 - parameters.bits[0])
		const downsample = Math.max(1, Math.round(parameters.downsample[0]))

		for (let ch = 0; ch < output.length; ch++) {
			const inChannel = input[ch]
			const outChannel = output[ch]
			if (!inChannel) {
				outChannel.fill(0)
				continue
			}
			let held = this.held[ch] ?? 0
			let phase = this.phase[ch] ?? 0
			for (let i = 0; i < outChannel.length; i++) {
				if (phase === 0) held = step * Math.round(inChannel[i] / step)
				outChannel[i] = held
				phase = (phase + 1) % downsample
			}
			this.held[ch] = held
			this.phase[ch] = phase
		}
		return true
	}
}

registerProcessor("bit-crusher-processor", BitCrusherProcessor)
