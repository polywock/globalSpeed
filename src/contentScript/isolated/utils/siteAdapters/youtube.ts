export const IS_YOUTUBE = ["youtube.com", "youtube-nocookie.com"].some(
	(domain) => location.hostname === domain || location.hostname.endsWith(`.${domain}`),
)

export type YoutubeCaptionsMessage = { type: "YOUTUBE_CAPTIONS"; enabled: boolean }
