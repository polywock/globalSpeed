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
	itcPanel: "contentScript/itcPanel/index.ts",
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

// addons-linter flags any textual `Function(...)` as eval, and lodash.debounce ships a
// UMD root fallback that never runs here (see the `global` define below) but still lands
// in the bundle. Rewrite it at the source so the string never reaches the output.
function stripLodashEval() {
	return {
		name: "strip-lodash-eval",
		enforce: "pre",
		transform(code, id) {
			if (!id.includes("lodash.debounce")) return
			if (!code.includes("Function('return this')()")) return
			return { code: code.replaceAll("Function('return this')()", "globalThis"), map: null }
		},
	}
}

// React DOM ships the implementation of dangerouslySetInnerHTML even though this
// extension never uses that API. Firefox therefore reports two unreachable dynamic
// innerHTML assignments in the shared UI chunk. Disable the API in Firefox bundles
// so those assignments cannot be reached (or flagged) now or in future code.
function disableReactUnsafeHtml(firefox) {
	return {
		name: "disable-react-unsafe-html",
		enforce: "pre",
		transform(code, id) {
			if (!firefox || !id.includes("react-dom") || !code.includes(".innerHTML =")) return
			return {
				code: code.replace(
					/\b(?:domElement|parent)\.innerHTML = (?:key|html);/g,
					'throw Error("dangerouslySetInnerHTML is disabled in this extension");',
				),
				map: null,
			}
		},
	}
}

function sharedConfig({ firefox, outDir, production }) {
	return {
		base: "./",
		publicDir: false,
		plugins: [browserModules(firefox), stripLodashEval(), disableReactUnsafeHtml(firefox), tailwindcss()],
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
