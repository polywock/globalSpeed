// /// <reference types="@types/node" />

import { cpSync, mkdirSync, rmSync } from "node:fs"
import { resolve } from "node:path"
import { build } from "vite"
import { pageConfig, scriptConfig } from "../vite.config.js"

const projectRoot = resolve(import.meta.dirname, "..")
const firefox = process.env.FIREFOX === "true"
const production = process.env.NODE_ENV === "production"
const buildRoot = resolve(projectRoot, firefox ? "buildFf" : "build")
const outDir = resolve(buildRoot, "unpacked")

async function main() {
	if (![resolve(projectRoot, "build"), resolve(projectRoot, "buildFf")].includes(buildRoot)) {
		throw new Error(`Refusing to clear unexpected build path: ${buildRoot}`)
	}

	rmSync(buildRoot, { recursive: true, force: true })
	mkdirSync(outDir, { recursive: true })
	cpSync(resolve(projectRoot, "static"), outDir, { recursive: true })
	cpSync(resolve(projectRoot, firefox ? "staticFf" : "staticCh"), outDir, { recursive: true })

	const mode = production ? "production" : "development"
	const run = (config) => build({ ...config, configFile: false, mode })

	await run(pageConfig({ firefox, outDir, production }))
	if (!firefox) await run(pageConfig({ firefox, outDir, production, chromiumOffscreen: true }))

	const names = ["isolated", "background", "main", "pageDraw", "pane", "itcPanel"]
	if (firefox) names.push("mainLoader")
	else names.push("sound-touch-processor", "reverse-sound-processor")

	for (const name of names) {
		await run(scriptConfig({ name, firefox, outDir, production }))
	}
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
