import { gvar } from "@/globalVar"
import { AudioFx, StateView } from "../types"
import { MessageCallback } from "../utils/browserUtils"
import { FREQUENCY_MAX, FREQUENCY_MIN, isEffectActive, Q_DEFAULT, STEREO_EFFECT_TYPES } from "../utils/audioFx"
import { clamp, round } from "../utils/helper"
import { Jungle } from "./Jungle"
import { ReverseNode } from "./ReverseNode"
import { SoundTouchNode } from "./SoundTouchNode"

declare global {
	namespace chrome.runtime {
		interface Port {
			linkedTabId: number
		}
	}

	interface GlobalVar {
		captureMgr: CaptureManager
	}

	interface Message {
		CAPTURE: { type: "CAPTURE"; tabId: number; streamId?: string; view?: StateView }
		REQUEST_CAPTURE_STATUS: { type: "REQUEST_CAPTURE_STATUS"; tabId: number; ping?: boolean }
		OFFSCREEN_PUSH: { type: "OFFSCREEN_PUSH"; superDisable: boolean; updates: { view: StateView; tabId: number }[] }
		PLAY: { type: "PLAY" }
	}
}

class CaptureManager {
	audioCtx: AudioContext
	infos: CaptureInfo[] = []
	constructor() {
		chrome.runtime.onMessage.addListener(this.handleMessage)
		chrome.runtime.onConnect.addListener((port) => {
			if (port.name.startsWith("REVERSE")) {
				const data = JSON.parse(port.name.slice(8))
				if (data?.tabId == null) {
					port.disconnect()
					return
				}
				port.onDisconnect.addListener(this.handleReversePortDisconnect)
				port.linkedTabId = data.tabId

				try {
					this.initReverse(data.tabId, port)
				} catch (err) {
					this.handleReversePortDisconnect(port)
				}
			}
		})
	}
	handleReversePortDisconnect = (port: chrome.runtime.Port) => {
		port.onDisconnect.removeListener(this.handleReversePortDisconnect)
		port.onMessage.removeListener(this.handleReversePortMessage)
		port.disconnect()

		const id = port.linkedTabId
		if (!id) return

		const info = this.infos.find((info) => info.tabId === id)
		if (!info?.reverseNode) return

		const node = info.reverseNode

		// connect output back to speaker
		info.outputNode.connect(this.audioCtx.destination)

		// ensure no outgoing connections
		node.disconnect()

		// ensure output not connected to node.
		try {
			info.outputNode.disconnect(node)
		} catch (err) {}

		node.forceEnd()

		info.unpauseFunctions?.forEach((fn) => fn())

		delete info.unpauseFunctions
		delete info.reverseNode
		delete info.reversePort
	}
	handleReversePortMessage = async (msg: Messages, port: chrome.runtime.Port) => {
		if (!port.linkedTabId) return
		const info = this.infos.find((info) => info.tabId === port.linkedTabId)
		if (!info?.reverseNode) return

		if (msg.type === "PLAY") {
			info.outputNode.disconnect(info.reverseNode)
		}
	}
	handleReverseNodePlay = async (tabId: number) => {
		const info = this.infos.find((info) => info.tabId === tabId)
		if (!info?.reversePort) return

		info.reversePort.postMessage({ type: "PLAYING" })
	}
	handleReverseNodeEnded = async (tabId: number) => {
		const info = this.infos.find((info) => info.tabId === tabId)
		if (!info?.reversePort) return
		info.reversePort.disconnect()
		this.handleReversePortDisconnect(info.reversePort)
	}
	initReverse = async (tabId: number, port: chrome.runtime.Port) => {
		let info = this.infos.find((info) => info.tabId === tabId)
		if (!info || info.reverseNode) {
			throw Error("Reverse already exists, or no tab capture.")
		}
		try {
			await ReverseNode.addModule(this.audioCtx)
		} catch (err) {
			this.handleReversePortDisconnect(port)
			return
		}

		info.reversePort = port
		info.unpauseFunctions = []
		info.reverseNode = new ReverseNode(this.audioCtx, info.tabId)
		const node = info.reverseNode

		node.playingCb = this.handleReverseNodePlay
		node.endedCb = this.handleReverseNodeEnded

		port.onMessage.addListener(this.handleReversePortMessage)

		info.outputNode.disconnect(this.audioCtx.destination)
		info.outputNode.connect(node)
		node.connect(this.audioCtx.destination)
	}
	handleMessage: MessageCallback = (msg: Messages, sender, reply) => {
		if (msg.type === "CAPTURE") {
			if (msg.tabId == null) return reply(false)
			if (msg.streamId) {
				this.captureTab(msg.tabId, msg.streamId, msg.view).then(
					(status) => {
						reply(status)
					},
					(err) => reply(false),
				)
				return true
			} else {
				this.releaseTab(msg.tabId)
				reply(true)
			}
		} else if (msg.type === "REQUEST_CAPTURE_STATUS") {
			const value = this.infos.some((info) => info.tabId === msg.tabId)
			if (msg.ping) chrome.runtime.sendMessage({ type: "CAPTURE_STATUS", tabId: msg.tabId, value })
			this.syncInfoSizeChange()
			reply(value)
		} else if (msg.type === "OFFSCREEN_PUSH") {
			if (msg.superDisable) {
				this.infos.forEach((info) => {
					this.releaseTab(info.tabId)
				})
				return
			}
			const updates = (msg.updates || []) as { view: StateView; tabId: number }[]
			let sendUpdateFlag = false
			updates.forEach((update) => {
				const info = this.infos.find((info) => info.tabId === update.tabId)
				if (!info) {
					sendUpdateFlag = true
					return
				}
				info.latestData = update.view
				this.handleChange(info)
			})
			sendUpdateFlag && this.syncInfoSizeChange()
		}
	}
	captureTab = async (tabId: number, streamId: string, view: StateView) => {
		if (this.infos.find((info) => info.tabId === tabId)) return true
		let stream: MediaStream
		try {
			stream = await getMediaStream(streamId)
			this.syncInfoSizeChange()
		} catch (err) {
			console.error(err)
			this.syncInfoSizeChange()
			return
		}
		this.audioCtx = this.audioCtx || new AudioContext({ sampleRate: 44100, latencyHint: 0 })

		const outputNode = this.audioCtx.createGain()
		outputNode.connect(this.audioCtx.destination)

		let info: CaptureInfo = {
			tabId,
			stream,
			streamSrc: this.audioCtx.createMediaStreamSource(stream),
			outputNode,
			latestData: view,
		}

		this.infos.push(info)
		info.streamSrc.connect(outputNode)
		chrome.runtime.sendMessage({ type: "CAPTURE_STATUS", tabId, value: true })
		this.syncInfoSizeChange()

		stream.addEventListener("inactive", (e) => {
			this.releaseTab(tabId)
		})

		this.handleChange(info)
		return true
	}
	releaseTab = (tabId: number) => {
		const infoIdx = this.infos.findIndex((info) => info.tabId === tabId)
		if (infoIdx < 0) return
		const info = this.infos[infoIdx]

		if (info.reversePort) {
			this.handleReversePortDisconnect(info.reversePort)
		}

		info.stream.getAudioTracks().forEach((track) => track.stop())
		delete info.latestData
		delete info.stream
		this.infos.splice(infoIdx, 1)
		info.fx?.release()
		delete info.fx
		info.outputNode?.disconnect()
		delete info.outputNode
		info.streamSrc.disconnect()
		delete info.streamSrc

		this.syncInfoSizeChange()
		chrome.runtime.sendMessage({ type: "CAPTURE_STATUS", tabId, value: false })
	}
	handleChange = (info: CaptureInfo) => {
		const { streamSrc } = info
		const { enabled, audioFx, audioFxAlt, monoOutput } = info.latestData

		streamSrc.disconnect()
		info.fx = info.fx || new AudioEffectComplex(this.audioCtx)

		info.fx.updateFx(enabled, audioFx, audioFxAlt, monoOutput)

		streamSrc.connect(info.fx.input)
		info.fx.output.connect(info.outputNode)
	}
	syncInfoSizeChange = async () => {
		await chrome.runtime.sendMessage({ type: "SET_LOCAL", override: { "s:captured": this.infos.map((info) => info.tabId) } })
		if (this.infos.length === 0) {
			window.close()
		}
	}
}

type CaptureInfo = {
	tabId: number
	stream: MediaStream
	streamSrc: MediaStreamAudioSourceNode
	outputNode: GainNode
	latestData?: StateView
	fx?: AudioEffectComplex
	reverseNode?: ReverseNode
	reversePort?: chrome.runtime.Port
	unpauseFunctions?: Function[]
}

class AudioEffectComplex {
	input: GainNode
	output: GainNode
	main?: AudioEffect
	alt?: AudioEffect
	splitter?: ChannelSplitterNode
	merger?: ChannelMergerNode
	/** In split mode, the left side's stereo effects on the combined output. */
	post?: AudioEffect

	constructor(public ctx: AudioContext) {
		this.input = ctx.createGain()
		this.output = ctx.createGain()
	}
	release = () => {
		this.estrange()
		this.main?.release()
		this.alt?.release()
		this.post?.release()
	}
	updateFx = async (enabled: boolean, audioFx: AudioFx, audioFxAlt: AudioFx, monoOutput: boolean) => {
		let head = this.input as AudioNode
		this.estrange()

		// Each split side carries one channel, so stereo effects can't run inside a side.
		const split = enabled && !!audioFxAlt

		this.main = this.main || new AudioEffect(this.ctx)
		this.main.updateFx(enabled, audioFx, split)

		if (split) {
			head.channelCount = 2
			head.channelCountMode = "explicit"

			this.splitter = this.splitter || this.ctx.createChannelSplitter(2)
			head.connect(this.splitter)

			this.alt = this.alt || new AudioEffect(this.ctx)
			this.alt.updateFx(enabled, audioFxAlt, true)

			this.splitter.connect(this.main.input, 0)
			this.splitter.connect(this.alt.input, 1)

			this.merger = this.merger || this.ctx.createChannelMerger(2)
			this.main.output.connect(this.merger, undefined, 0)
			this.alt.output.connect(this.merger, undefined, 1)
			head = this.merger
		} else {
			head.channelCountMode = "max"
			this.alt?.release()
			delete this.alt
			delete this.splitter
			delete this.merger

			head.connect(this.main.input)
			head = this.main.output
		}

		// The left side's stereo effects run on the combined output instead, in their list order.
		const stereo = split ? (audioFx?.effects ?? []).filter((e) => STEREO_EFFECT_TYPES.has(e.type)) : []
		if (stereo.length) {
			this.post = this.post || new AudioEffect(this.ctx)
			this.post.updateFx(enabled, { pitch: 0, volume: 1, effects: stereo })
			head.connect(this.post.input)
			head = this.post.output
		} else {
			this.post?.release()
			delete this.post
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
		this.post?.output.disconnect()
	}
}

type EffectNodes = {
	filters?: BiquadFilterNode[]
	filter?: BiquadFilterNode
	delay?: DelayNode
	mix?: GainNode
	dry?: GainNode
	wet?: GainNode
	panner?: StereoPannerNode
	compressor?: DynamicsCompressorNode
	convolver?: ConvolverNode
	convolverSize?: number
	shaper?: WaveShaperNode
	shaperDrive?: number
	osc?: OscillatorNode
	lfo?: GainNode
	amp?: GainNode
	ampLfo?: GainNode
	feedback?: GainNode
	crusher?: AudioWorkletNode
	splitter?: ChannelSplitterNode
	merger?: ChannelMergerNode
	gains?: GainNode[]
}

function disconnectEffectNodes(nodes: EffectNodes) {
	for (const value of Object.values(nodes)) {
		if (Array.isArray(value)) value.forEach((n) => n.disconnect())
		else if (value instanceof AudioNode) value.disconnect()
	}
}

function releaseEffectNodes(nodes: EffectNodes) {
	disconnectEffectNodes(nodes)
	try {
		nodes.osc?.stop()
	} catch {}
}

/** Decaying noise, which a convolver turns into a reverb tail of about `seconds`. */
function createImpulse(ctx: BaseAudioContext, seconds: number) {
	const length = Math.max(1, Math.round(ctx.sampleRate * seconds))
	const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
	for (let ch = 0; ch < 2; ch++) {
		const data = buffer.getChannelData(ch)
		for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3
	}
	return buffer
}

/** Soft clipping; the curve keeps full scale at any drive so distortion doesn't just get louder. */
function createDistortionCurve(drive: number) {
	const gain = 1 + drive / 5
	const curve = new Float32Array(4096)
	const norm = Math.tanh(gain)
	for (let i = 0; i < curve.length; i++) {
		const x = (i * 2) / (curve.length - 1) - 1
		curve[i] = Math.tanh(gain * x) / norm
	}
	return curve
}

let bitCrusherModule: Promise<boolean>
function loadBitCrusher(ctx: AudioContext) {
	bitCrusherModule =
		bitCrusherModule ??
		ctx.audioWorklet.addModule("bit-crusher-processor.js").then(
			() => true,
			() => false,
		)
	return bitCrusherModule
}

class AudioEffect {
	input: GainNode
	output: GainNode

	jungle?: Jungle
	soundTouchNode?: SoundTouchNode
	/** Nodes per effect id, reused so a delay keeps its buffer while values change. */
	effectNodes = new Map<string, EffectNodes>()
	/** Bumped per update so one that finishes loading after a newer one started leaves the graph alone. */
	updateGen = 0

	constructor(public ctx: AudioContext) {
		this.input = ctx.createGain()
		this.output = ctx.createGain()
	}
	release = () => {
		this.updateGen++
		this.estrange()
		this.jungle?.release()
		this.soundTouchNode?.release()
		delete this.jungle
		this.clearEffectNodes()
	}
	clearEffectNodes = () => {
		this.effectNodes.forEach(releaseEffectNodes)
		this.effectNodes.clear()
	}
	errorCount = 0
	handleProcessorError = (err: Event) => {
		console.error("SoundTouchProcessor error: ", err)
		this.soundTouchNode?.release()
		delete this.soundTouchNode
		if (this.errorCount++ < 10) this.latestUpdateFx?.()
	}
	latestUpdateFx: () => void
	updateFx = async (enabled: boolean, audioFx?: AudioFx, skipStereo?: boolean) => {
		this.latestUpdateFx = () => this.updateFx(enabled, audioFx, skipStereo)
		const gen = ++this.updateGen

		let head = this.input as AudioNode

		if (!enabled || !audioFx) {
			this.estrange()
			this.jungle?.release()
			delete this.jungle
			this.soundTouchNode?.release()
			delete this.soundTouchNode
			this.clearEffectNodes()
			head.connect(this.output)
			this.output.gain.value = 1
			return
		}

		const effects = (audioFx.effects ?? []).filter((e) => isEffectActive(e) && !(skipStereo && STEREO_EFFECT_TYPES.has(e.type)))

		// Load modules before touching the graph. A newer update may run meanwhile, and two updates
		// reconnecting at once would leave the older chain wired in, still audible.
		try {
			await SoundTouchNode.addModule(this.ctx)
		} catch (err) {}
		const crusherReady = effects.some((e) => e.type === "distortion" && ((e.bits ?? 16) < 16 || (e.downsample ?? 1) > 1)) && (await loadBitCrusher(this.ctx))
		if (gen !== this.updateGen) return
		this.estrange()

		// jungle pitch
		if (audioFx.jungleMode && audioFx.pitch !== null && audioFx.pitch !== 0) {
			this.jungle = this.jungle ?? new Jungle(this.ctx)
			this.jungle.setPitchOffset(audioFx.pitch)
			head.connect(this.jungle.input)
			head = this.jungle.output
		} else {
			this.jungle?.release()
			delete this.jungle
		}

		// soundtouch pitch
		const soundTouchActive = !audioFx.jungleMode && audioFx.pitch !== null && audioFx.pitch !== 0
		if (SoundTouchNode.addedModule && soundTouchActive && this.errorCount < 10) {
			if (!this.soundTouchNode) {
				this.soundTouchNode = new SoundTouchNode(this.ctx)
				this.soundTouchNode.onprocessorerror = this.handleProcessorError
			}

			this.soundTouchNode.update(audioFx.pitch)

			head.connect(this.soundTouchNode)
			head = this.soundTouchNode
		} else {
			this.soundTouchNode?.release()
			delete this.soundTouchNode
		}

		// effects, in list order
		const ctx = this.ctx

		/** Splits `from` into dry and wet (through `wetIn` to `wetOut`) and returns the mix. */
		const wetDry = (nodes: EffectNodes, from: AudioNode, wetIn: AudioNode, wetOut: AudioNode, mix: number) => {
			const out = (nodes.mix = nodes.mix ?? ctx.createGain())
			const dry = (nodes.dry = nodes.dry ?? ctx.createGain())
			const wet = (nodes.wet = nodes.wet ?? ctx.createGain())
			dry.gain.value = 1 - clamp(0, 1, mix)
			wet.gain.value = clamp(0, 1, mix)
			from.connect(dry)
			dry.connect(out)
			from.connect(wetIn)
			wetOut.connect(wet)
			wet.connect(out)
			return out
		}
		/** The effect's LFO, shared by everything it wobbles so they stay in step. */
		const oscillator = (nodes: EffectNodes, rate: number) => {
			if (!nodes.osc) {
				nodes.osc = ctx.createOscillator()
				nodes.osc.start()
			}
			nodes.osc.frequency.value = clamp(0.05, 20, rate)
			return nodes.osc
		}
		const lfo = (nodes: EffectNodes, rate: number, amount: number) => {
			nodes.lfo = nodes.lfo ?? ctx.createGain()
			nodes.lfo.gain.value = amount
			oscillator(nodes, rate).connect(nodes.lfo)
			return nodes.lfo
		}

		const used = new Set<string>()
		for (const effect of effects) {
			used.add(effect.id)
			const nodes = this.effectNodes.get(effect.id) ?? {}
			this.effectNodes.set(effect.id, nodes)

			if (effect.type === "eq") {
				const { eq } = effect
				const pool = nodes.filters ?? []
				const filters: BiquadFilterNode[] = []
				const Q = 1.41 * (eq.values.length / 10)
				eq.values.forEach((v, i) => {
					if (v === 0) return
					const node = pool.shift() ?? ctx.createBiquadFilter()
					filters.push(node)
					node.type = i === 0 ? "lowshelf" : i === eq.values.length - 1 ? "highshelf" : "peaking"
					node.frequency.value = round(31.25 * 2 ** (i / Math.round(eq.values.length / 10)), 2)
					node.gain.value = v * (eq.factor ?? 1)
					node.Q.value = Q
					head.connect(node)
					head = node
				})
				nodes.filters = filters
			} else if (effect.type === "freqFilter") {
				const node = (nodes.filter = nodes.filter ?? ctx.createBiquadFilter())
				node.type = effect.filterType ?? "lowpass"
				node.frequency.value = clamp(FREQUENCY_MIN, FREQUENCY_MAX, effect.frequency ?? 1000)
				node.Q.value = clamp(0.0001, 30, effect.q ?? Q_DEFAULT)
				node.gain.value = clamp(-24, 24, effect.gain ?? 0)
				head.connect(node)
				head = node
			} else if (effect.type === "compressor") {
				const node = (nodes.compressor = nodes.compressor ?? ctx.createDynamicsCompressor())
				node.threshold.value = clamp(-100, 0, effect.threshold ?? -24)
				node.ratio.value = clamp(1, 20, effect.ratio ?? 4)
				head.connect(node)
				head = node
			} else if (effect.type === "delay") {
				if (!nodes.delay || effect.delay > nodes.delay.delayTime.maxValue) {
					nodes.delay = ctx.createDelay(effect.delay > 10 ? 179.99 : 10)
				}
				nodes.delay.delayTime.value = clamp(0, nodes.delay.delayTime.maxValue, effect.delay)
				const mix = (nodes.mix = nodes.mix ?? ctx.createGain())
				head.connect(nodes.delay)
				nodes.delay.connect(mix)
				// Merge keeps the undelayed audio alongside the delayed copy.
				if (effect.delayMerge) head.connect(mix)
				head = mix
			} else if (effect.type === "reverb") {
				const size = round(clamp(0.1, 10, effect.size ?? 2), 1)
				if (!nodes.convolver || nodes.convolverSize !== size) {
					nodes.convolver?.disconnect()
					nodes.convolver = ctx.createConvolver()
					nodes.convolver.buffer = createImpulse(ctx, size)
					nodes.convolverSize = size
				}
				head = wetDry(nodes, head, nodes.convolver, nodes.convolver, effect.mix ?? 0.3)
			} else if (effect.type === "modulation") {
				// One LFO wobbles a short delay's length (pitch) and the gain (volume).
				const rate = effect.rate ?? 1.5
				const pitchDepth = clamp(0, 1, effect.pitchDepth ?? 0)
				const volumeDepth = clamp(0, 1, effect.volumeDepth ?? 0)
				if (pitchDepth > 0) {
					nodes.delay = nodes.delay ?? ctx.createDelay(0.1)
					nodes.delay.delayTime.value = clamp(1, 30, effect.delayTime ?? 20) / 1000
					lfo(nodes, rate, pitchDepth * 0.008).connect(nodes.delay.delayTime)
					const feedback = clamp(0, 0.9, effect.feedback ?? 0)
					if (feedback > 0) {
						nodes.feedback = nodes.feedback ?? ctx.createGain()
						nodes.feedback.gain.value = feedback
						nodes.delay.connect(nodes.feedback)
						nodes.feedback.connect(nodes.delay)
					}
					head = wetDry(nodes, head, nodes.delay, nodes.delay, effect.mix ?? 0.5)
				}
				if (volumeDepth > 0) {
					// Gain swings between 1 - depth and 1.
					const amp = (nodes.amp = nodes.amp ?? ctx.createGain())
					amp.gain.value = 1 - volumeDepth / 2
					nodes.ampLfo = nodes.ampLfo ?? ctx.createGain()
					nodes.ampLfo.gain.value = volumeDepth / 2
					oscillator(nodes, rate).connect(nodes.ampLfo)
					nodes.ampLfo.connect(amp.gain)
					head.connect(amp)
					head = amp
				}
			} else if (effect.type === "distortion") {
				// Soft clipping, then bit crushing, both inside one wet path.
				const drive = clamp(0, 100, effect.drive ?? 0)
				const bits = clamp(1, 16, effect.bits ?? 16)
				const downsample = clamp(1, 40, effect.downsample ?? 1)
				const stages: AudioNode[] = []
				if (drive > 0) {
					if (!nodes.shaper || nodes.shaperDrive !== drive) {
						nodes.shaper = nodes.shaper ?? ctx.createWaveShaper()
						nodes.shaper.curve = createDistortionCurve(drive)
						nodes.shaper.oversample = "4x"
						nodes.shaperDrive = drive
					}
					stages.push(nodes.shaper)
				}
				if (crusherReady && (bits < 16 || downsample > 1)) {
					const node = (nodes.crusher = nodes.crusher ?? new AudioWorkletNode(ctx, "bit-crusher-processor"))
					node.parameters.get("bits").value = bits
					node.parameters.get("downsample").value = downsample
					stages.push(node)
				}
				if (!stages.length) continue
				for (let i = 1; i < stages.length; i++) stages[i - 1].connect(stages[i])
				head = wetDry(nodes, head, stages[0], stages[stages.length - 1], effect.mix ?? 1)
			} else if (effect.type === "pan") {
				const node = (nodes.panner = nodes.panner ?? ctx.createStereoPanner())
				node.pan.value = clamp(-1, 1, effect.pan ?? 0)
				head.connect(node)
				head = node
			} else if (effect.type === "width") {
				const w = clamp(0, 4, effect.width ?? 1)
				// Mid/side: each output is mid + width * side, written as left/right cross gains.
				const splitter = (nodes.splitter = nodes.splitter ?? ctx.createChannelSplitter(2))
				const merger = (nodes.merger = nodes.merger ?? ctx.createChannelMerger(2))
				const [ll, rl, lr, rr] = (nodes.gains = nodes.gains ?? [0, 1, 2, 3].map(() => ctx.createGain()))
				ll.gain.value = rr.gain.value = (1 + w) / 2
				rl.gain.value = lr.gain.value = (1 - w) / 2
				head.connect(splitter)
				splitter.connect(ll, 0)
				splitter.connect(rl, 1)
				splitter.connect(lr, 0)
				splitter.connect(rr, 1)
				ll.connect(merger, 0, 0)
				rl.connect(merger, 0, 0)
				lr.connect(merger, 0, 1)
				rr.connect(merger, 0, 1)
				head = merger
			}
		}
		for (const [id, nodes] of [...this.effectNodes]) {
			if (!used.has(id)) {
				releaseEffectNodes(nodes)
				this.effectNodes.delete(id)
			}
		}

		head.connect(this.output)

		// gain
		if (audioFx.volume != null && audioFx.volume !== 1) {
			this.output.gain.value = audioFx.volume * audioFx.volume
		} else {
			this.output.gain.value = 1
		}
	}
	estrange = () => {
		this.input.disconnect()
		this.effectNodes.forEach(disconnectEffectNodes)
		this.jungle?.output?.disconnect()
		this.soundTouchNode?.disconnect()
	}
}

async function getMediaStream(streamId: string) {
	return navigator.mediaDevices.getUserMedia({
		video: false,
		audio: {
			mandatory: {
				chromeMediaSource: "tab",
				chromeMediaSourceId: streamId,
			},
		} as any,
	})
}

gvar.captureMgr = new CaptureManager()
