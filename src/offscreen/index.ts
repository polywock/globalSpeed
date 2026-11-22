import { gvar } from "@/globalVar"
import { AudioFx, StateView } from "../types"
import { MessageCallback } from "../utils/browserUtils"
import { FREQUENCY_MAX, FREQUENCY_MIN, isEffectActive, Q_DEFAULT } from "../utils/audioFx"
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

		// Each split side carries one channel, which a panner can't place, so pan the merged output instead.
		const split = enabled && !!audioFxAlt
		const pan = split ? (audioFx?.effects?.find((e) => e.type === "pan" && isEffectActive(e))?.pan ?? 0) : 0

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

		if (enabled && pan) {
			this.pan = this.pan || this.ctx.createStereoPanner()
			this.pan.pan.value = clamp(-1, 1, pan || 0)

			head.connect(this.pan)
			head = this.pan
		} else {
			this.pan?.disconnect()
			delete this.pan
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

type EffectNodes = {
	filters?: BiquadFilterNode[]
	filter?: BiquadFilterNode
	delay?: DelayNode
	mix?: GainNode
	panner?: StereoPannerNode
}

class AudioEffect {
	input: GainNode
	output: GainNode

	jungle?: Jungle
	soundTouchNode?: SoundTouchNode
	/** Nodes per effect id, reused so a delay keeps its buffer while values change. */
	effectNodes = new Map<string, EffectNodes>()

	constructor(public ctx: AudioContext) {
		this.input = ctx.createGain()
		this.output = ctx.createGain()
	}
	release = () => {
		this.estrange()
		this.jungle?.release()
		this.soundTouchNode?.release()
		delete this.jungle
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
	updateFx = async (enabled: boolean, audioFx?: AudioFx, skipPan?: boolean) => {
		this.latestUpdateFx = () => this.updateFx(enabled, audioFx, skipPan)
		this.estrange()

		let head = this.input as AudioNode

		if (!enabled || !audioFx) {
			this.jungle?.release()
			delete this.jungle
			this.soundTouchNode?.release()
			delete this.soundTouchNode
			this.effectNodes.clear()
			head.connect(this.output)
			this.output.gain.value = 1
			return
		}

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

		// try adding module.
		try {
			await SoundTouchNode.addModule(this.ctx)
		} catch (err) {}

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
		const used = new Set<string>()
		for (const effect of audioFx.effects ?? []) {
			if (!isEffectActive(effect) || (skipPan && effect.type === "pan")) continue
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
					const node = pool.shift() ?? this.ctx.createBiquadFilter()
					filters.push(node)
					node.type = i === 0 ? "lowshelf" : i === eq.values.length - 1 ? "highshelf" : "peaking"
					node.frequency.value = round(31.25 * 2 ** (i / Math.round(eq.values.length / 10)), 2)
					node.gain.value = v * (eq.factor ?? 1)
					node.Q.value = Q
					head.connect(node)
					head = node
				})
				nodes.filters = filters
			} else if (effect.type === "lowpass" || effect.type === "highpass") {
				const node = (nodes.filter = nodes.filter ?? this.ctx.createBiquadFilter())
				node.type = effect.type
				node.frequency.value = clamp(FREQUENCY_MIN, FREQUENCY_MAX, effect.frequency ?? FREQUENCY_MAX)
				node.Q.value = clamp(0.0001, 30, effect.q ?? Q_DEFAULT)
				head.connect(node)
				head = node
			} else if (effect.type === "delay") {
				if (!nodes.delay || effect.delay > nodes.delay.delayTime.maxValue) {
					nodes.delay = this.ctx.createDelay(effect.delay > 10 ? 179.99 : 10)
				}
				nodes.delay.delayTime.value = clamp(0, nodes.delay.delayTime.maxValue, effect.delay)
				const mix = (nodes.mix = nodes.mix ?? this.ctx.createGain())
				head.connect(nodes.delay)
				nodes.delay.connect(mix)
				// Merge keeps the undelayed audio alongside the delayed copy.
				if (effect.delayMerge) head.connect(mix)
				head = mix
			} else if (effect.type === "pan") {
				const node = (nodes.panner = nodes.panner ?? this.ctx.createStereoPanner())
				node.pan.value = clamp(-1, 1, effect.pan ?? 0)
				head.connect(node)
				head = node
			}
		}
		for (const id of [...this.effectNodes.keys()]) {
			if (!used.has(id)) this.effectNodes.delete(id)
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
		this.effectNodes.forEach((nodes) => {
			nodes.filters?.forEach((f) => f.disconnect())
			nodes.filter?.disconnect()
			nodes.delay?.disconnect()
			nodes.mix?.disconnect()
			nodes.panner?.disconnect()
		})
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
