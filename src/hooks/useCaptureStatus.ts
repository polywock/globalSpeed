import { useEffect, useState } from "react"
import { MessageCallback } from "../utils/browserUtils"

declare global {
	interface Message {
		CAPTURE_STATUS: { type: "CAPTURE_STATUS"; tabId: number; value: boolean }
	}
}

export function useCaptureStatus() {
	const [status, setStatus] = useState(null as boolean)

	useEffect(() => {
		const handleMessage: MessageCallback = (msg: Messages, sender, reply) => {
			if (msg.type === "CAPTURE_STATUS") {
				if (msg.tabId === gvar.tabInfo.tabId) {
					setStatus(msg.value)
					reply(true)
					return
				}
			}
		}
		chrome.runtime.onMessage.addListener(handleMessage)
		chrome.runtime.sendMessage({ type: "REQUEST_CAPTURE_STATUS", tabId: gvar.tabInfo.tabId, ping: true })

		return () => {
			chrome.runtime.onMessage.removeListener(handleMessage)
		}
	}, [])

	return status
}
