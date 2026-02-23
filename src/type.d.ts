declare module "soundtouchjs"

declare namespace chrome.storage {
	export type StorageChanges = {
		[key: string]: { newValue?: any; oldValue?: any }
	}

	export type StorageKeysArgument = string | string[] | { [key: string]: any } | null | undefined
}

declare namespace chrome.tabCapture {
	export interface GetMediaStreamOptions {
		targetTabId?: number
		consumerTabId?: number
	}

	export function getMediaStreamId(options: GetMediaStreamOptions, callback: (streamId: string) => void): void
	export function getMediaStreamId(options: GetMediaStreamOptions): Promise<string>
}

declare module "*.css?raw" {
	const content: string
	export default content
}

type RecordAny = Record<string, any>
