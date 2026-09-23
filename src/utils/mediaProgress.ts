// This stream is intentionally separate from the shared session-storage media list.
export const MEDIA_PROGRESS_PORT = "media-progress"

export type MediaProgress = {
	key: string
	currentTime: number
	// null represents live or unknown duration (Infinity/NaN cannot cross JSON ports).
	duration: number | null
}

export type MediaProgressMessage = { type: "PROGRESS"; media: MediaProgress[] }
export type MediaSeekMessage = { type: "SEEK"; key: string; time: number }
