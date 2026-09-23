import { useEffect, useMemo, useState } from "react"
import { MediaPath } from "@/contentScript/isolated/utils/genMediaInfo"
import { MEDIA_PROGRESS_PORT, MediaProgress, MediaProgressMessage, MediaSeekMessage } from "@/utils/mediaProgress"

type ProgressMap = Record<string, MediaProgress>
type Connection = { port: chrome.runtime.Port; release: () => void; media: MediaProgress[] }
const frameKey = (info: MediaPath) => `${info.tabInfo.tabId}:${info.tabInfo.frameId ?? 0}`

export function useMediaProgress(infos: MediaPath[], enabled: boolean) {
	const [progress, setProgress] = useState<ProgressMap>({})
	const client = useMemo(() => new MediaProgressClient(setProgress), [])
	useEffect(() => {
		client.sync(enabled ? (infos ?? []) : [])
	}, [client, infos, enabled])
	useEffect(() => () => client.release(), [client])
	return { progress, seek: client.seek }
}

export class MediaProgressClient {
	private connections = new Map<string, Connection>()

	constructor(private onChange: (progress: ProgressMap) => void) {}

	sync = (infos: MediaPath[]) => {
		const frames = new Map(infos.map((info) => [frameKey(info), info.tabInfo]))
		for (const [key, connection] of this.connections) {
			if (!frames.has(key)) {
				connection.release()
				this.connections.delete(key)
			}
		}
		for (const [key, tabInfo] of frames) {
			if (this.connections.has(key)) continue
			try {
				const port = chrome.tabs.connect(tabInfo.tabId, { name: MEDIA_PROGRESS_PORT, frameId: tabInfo.frameId ?? 0 })
				const connection: Connection = {
					port,
					media: [],
					release: () => {
						port.onMessage.removeListener(onMessage)
						port.onDisconnect.removeListener(onDisconnect)
						port.disconnect()
					},
				}
				const onMessage = (message: MediaProgressMessage) => {
					if (message?.type !== "PROGRESS" || !Array.isArray(message.media)) return
					connection.media = message.media
					this.publish()
				}
				const onDisconnect = () => {
					// Read lastError to consume expected failures for closed/unavailable frames.
					void chrome.runtime.lastError
					connection.release()
					this.connections.delete(key)
					this.publish()
				}
				this.connections.set(key, connection)
				port.onMessage.addListener(onMessage)
				port.onDisconnect.addListener(onDisconnect)
			} catch {
				// Discovery can race navigation. Retry on the next media-list update.
			}
		}
		this.publish()
	}
	seek = (info: MediaPath, time: number) => {
		const connection = this.connections.get(frameKey(info))
		if (!connection || !Number.isFinite(time)) return
		try {
			connection.port.postMessage({ type: "SEEK", key: info.key, time } satisfies MediaSeekMessage)
		} catch {
			connection.release()
			this.connections.delete(frameKey(info))
			this.publish()
		}
	}
	private publish = () => {
		this.onChange(Object.fromEntries([...this.connections.values()].flatMap(({ media }) => media.map((m) => [m.key, m]))))
	}
	release = () => {
		this.connections.forEach((connection) => connection.release())
		this.connections.clear()
	}
}
