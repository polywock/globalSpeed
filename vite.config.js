import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"

const projectRoot = import.meta.dirname
const srcRoot = resolve(projectRoot, "src")

const scriptEntries = {
	isolated: "contentScript/isolated/index.ts",
	background: "background/index.ts",
	main: "contentScript/main/index.ts",
	pageDraw: "contentScript/pageDraw/index.ts",
	pane: "contentScript/pane/index.ts",
	"sound-touch-processor": "offscreen/SoundTouchProcessor.ts",
	"reverse-sound-processor": "offscreen/ReverseProcessor.ts",
	mainLoader: "contentScript/main/loader.ts",
}

function browserModules(firefox) {
	const emptyPrefix = firefox ? "notFirefox/" : "isFirefox/"
	const sourcePrefix = firefox ? "isFirefox/" : "notFirefox/"

	return {
		name: "browser-modules",
		enforce: "pre",
		resolveId(id) {
			if (id.startsWith(sourcePrefix)) {
				return this.resolve(resolve(srcRoot, id.slice(sourcePrefix.length)), undefined, { skipSelf: true })
			}
			if (id.startsWith(emptyPrefix)) return `\0browser-empty:${id}`
		},
		load(id) {
			if (!id.startsWith("\0browser-empty:")) return
			if (id.endsWith("/popup/AudioPanel")) return "export const AudioPanel = undefined"
			return ""
		},
	}
}

// The Firefox loader inlines the whole main content script as a string, since it must
// run in the page world at document_start. Serving it as a virtual module lets Rollup
// emit the string literal itself, correctly escaped whatever quoting the minifier picks.
function mainCode(outDir) {
	const virtualId = "virtual:main-code"
	const resolvedId = `\0${virtualId}`

	return {
		name: "main-code",
		resolveId(id) {
			if (id === virtualId) return resolvedId
		},
		load(id) {
			if (id !== resolvedId) return
			// Relies on viteBuild.js building `main` before `mainLoader`.
			return `export default ${JSON.stringify(readFileSync(resolve(outDir, "main.js"), "utf8"))}`
		},
	}
}

function sharedConfig({ firefox, outDir, production }) {
	return {
		base: "./",
		publicDir: false,
		plugins: [browserModules(firefox), tailwindcss()],
		resolve: {
			alias: {
				"@": srcRoot,
			},
		},
		esbuild: {
			target: firefox ? "firefox125" : "chrome116",
		},
		// lodash.debounce's UMD root detection falls back to Function("return this")
		// when it finds neither `global` nor a `self` whose Object matches its own.
		// Firefox content scripts see an Xray-wrapped `self`, so it hit that fallback
		// and tripped the extension CSP. Webpack used to provide this shim for free.
		define: {
			global: "globalThis",
		},
		build: {
			target: firefox ? "firefox125" : "chrome116",
			outDir,
			emptyOutDir: false,
			minify: production,
			cssMinify: production,
			sourcemap: false,
		},
	}
}

function pageConfig({ firefox, outDir, production, chromiumOffscreen = false }) {
	const root = resolve(projectRoot, chromiumOffscreen ? "staticCh" : "static")
	const input = chromiumOffscreen
		? { offscreen: resolve(root, "offscreen.html") }
		: Object.fromEntries(["popup", "options", "faqs", "placer"].map((name) => [name, resolve(root, `${name}.html`)]))

	const config = sharedConfig({ firefox, outDir, production })
	return {
		...config,
		root,
		build: {
			...config.build,
			rollupOptions: {
				input,
				output: {
					entryFileNames: "[name].js",
					chunkFileNames: "chunks/[name]-[hash].js",
					assetFileNames: "assets/[name]-[hash][extname]",
				},
			},
		},
	}
}

function scriptConfig({ name, firefox, outDir, production }) {
	const config = sharedConfig({ firefox, outDir, production })
	return {
		...config,
		root: projectRoot,
		plugins: name === "mainLoader" ? [...config.plugins, mainCode(outDir)] : config.plugins,
		build: {
			...config.build,
			cssCodeSplit: false,
			rollupOptions: {
				input: resolve(srcRoot, scriptEntries[name]),
				// Extension and worklet scripts cannot rely on ESM or shared chunks.
				output: {
					format: "iife",
					name: "GlobalSpeed",
					entryFileNames: `${name}.js`,
					assetFileNames: "assets/[name]-[hash][extname]",
				},
			},
		},
	}
}

export { pageConfig, scriptConfig, scriptEntries }
