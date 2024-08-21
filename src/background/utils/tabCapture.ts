import { AUDIO_CONTEXT_KEYS } from "src/types"
import { isEdgeMobile } from "src/utils/helper"
import { fetchView } from "src/utils/state"

const offscreenUrl = chrome.runtime.getURL("offscreen.html")

export async function hasOffscreen(): Promise<boolean> {
    const contexts = await (chrome.runtime as any).getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    })
    return !!contexts.length
}

export async function ensureOffscreen() {
    const has = await hasOffscreen()
    if (has) return 
    await (chrome.offscreen as any).createDocument({
        url: offscreenUrl,
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: 'For audio effects like volume gain, pitch shift, etc.',
    })
}

export async function initTabCapture(tabId: number): Promise<boolean> {
    if (isEdgeMobile()) return false 
    await ensureOffscreen()
    try {
        const [streamId, view] = await Promise.all([
            chrome.tabCapture.getMediaStreamId({targetTabId: tabId}),
            fetchView(AUDIO_CONTEXT_KEYS, tabId)
        ])
        return chrome.runtime.sendMessage({type: "CAPTURE", streamId, tabId, view})
    } catch (err) {
        if (err?.message?.includes("invoked")) {
            return false 
        } else {
            return true 
        }
    } 
}

export async function releaseTabCapture(tabId: number) {
    const has = await hasOffscreen()
    if (!has) return 
    chrome.runtime.sendMessage({type: "CAPTURE", tabId})
}


export async function isTabCaptured(tabId?: number): Promise<boolean> {
    const has = await hasOffscreen()
    if (!has) return false 
    return chrome.runtime.sendMessage({type: "REQUEST_CAPTURE_STATUS", tabId})
}

export async function connectReversePort(tabId: number) {
    // ensure captured 
    if (!isTabCaptured(tabId)) {
        await initTabCapture(tabId)
    }

    return chrome.runtime.connect({name: `REVERSE ${JSON.stringify({tabId})}`})
}