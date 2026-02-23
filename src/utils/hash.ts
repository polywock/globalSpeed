// This is weak so used only for non-critical uses, only stored locally on user's computer.
// Sometimes the domain needs to be stored locally, but it's better to hash a little than none.
let encoder: TextEncoder
export async function hash(content: string, salt: string) {
	encoder = encoder ?? new TextEncoder()
	content = `${content}:${salt}`
	return bufferToHex(await crypto.subtle.digest("sha-1", encoder.encode(content)))
}

function bufferToHex(buf: ArrayBuffer) {
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

function generateSalt() {
	return crypto.randomUUID().slice(0, 18).replaceAll("-", "")
}

// Remember to call and await this before hashing to avoid changing salt.
export async function getStoredSalt() {
	let salt = (await chrome.storage.local.get<RecordAny>("f:salt"))["f:salt"]
	if (!salt) {
		salt = generateSalt()
		await chrome.storage.local.set({ "f:salt": salt })
	}
	return salt
}

export async function hashWithStoredSalt(content: string, truncate = 6) {
	return (await hash(content, await getStoredSalt())).slice(0, truncate ?? 99)
}
