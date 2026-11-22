export const IS_YOUTUBE = ["youtube.com", "youtube-nocookie.com"].some(
	(domain) => location.hostname === domain || location.hostname.endsWith(`.${domain}`),
)

/** Turns on main-world YouTube helpers (caption sync, live detection) while Global Speed sets the speed. */
export type YoutubeSyncMessage = { type: "YOUTUBE_SYNC"; enabled: boolean }
export type YoutubeLiveMessage = { type: "YOUTUBE_LIVE"; value: boolean }
