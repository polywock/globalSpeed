// /// <reference types="@types/node" />

// Must be done after Webpack builds for Firefox.
// Replaces $$$CTX$$$ placeholder within mainLoader.js to main.js code.

const { readFileSync, writeFileSync, unlinkSync } = require("fs")

function replace(targetPath, contentPath, stub) {
	let cs = readFileSync(targetPath, { encoding: "utf8" })
	let ctx = readFileSync(contentPath, { encoding: "utf8" })

	let placeholderCount = 0

	// In loop, since if webpack is being built for development their may be multiple copies.
	// In production mode, only 1 copy should remain.
	for (let i = 0; i < 10; i++) {
		if (cs.indexOf(stub) === -1) break
		cs = cs.replace(stub, JSON.stringify(ctx).slice(1, -1))
		placeholderCount++
	}

	if (!placeholderCount) throw Error(`This shouldn't happen. Could not find ${stub} placeholder.`)

	writeFileSync(targetPath, cs, { encoding: "utf8", flags: "w+" })
	console.log(`REPLACED ${stub} PLACEHOLDER (${placeholderCount})`)
}

function main() {
	replace(`buildFf/unpacked/mainLoader.js`, `buildFf/unpacked/main.js`, "$$$CTX$$$")
}

main()
