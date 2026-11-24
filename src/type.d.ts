declare module "soundtouchjs"

/** True in dev builds (`npm run dev`). Release builds replace it with false and drop the code behind it. */
declare const IS_DEV_BUILD: boolean

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

declare module "*.css?inline" {
	const content: string
	export default content
}

declare module "*.css" {}

// Built main.js source, inlined by the Firefox mainLoader build. See vite.config.js.
declare module "virtual:main-code" {
	const content: string
	export default content
}

type RecordAny = Record<string, any>
