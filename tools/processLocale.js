// /// <reference types="@types/node" />

const { readdir, readFile, writeFile, mkdir } = require("fs/promises")
const { join, parse } = require("path")
const { env, argv, exit } = require("process")
const { createInterface } = require("readline")
const OpenAI = require("openai")
const { z } = require("zod")
const { zodTextFormat } = require("openai/helpers/zod")

const CASING_SENSITIVE_LANGUAGES = ["de", "es", "fr", "id", "it", "ms", "pl", "pt_BR", "ru", "tr", "uk", "vi"]
const ALL_LANGUAGES = [...CASING_SENSITIVE_LANGUAGES, "ar", "ja", "ko", "th", "zh_CN", "zh_TW"]

/** @type { OpenAI } */
let openai

async function main() {
	if (argv[2] === "--casing") {
		ensureCasing()
	} else if (argv[2] === "--build") {
		build()
	} else {
		if (!env.OPENAI_API_KEY) {
			console.error("No OpenAI key provided as environmental variable.")
			exit(1)
		}
		openai = new OpenAI({
			apiKey: env.OPENAI_API_KEY,
		})
		adhereEnglish()
	}
}

let cachedKeyContext = {}

async function adhereEnglish() {
	let rootLocales = join("static", "locales")
	let englishLocale = join(rootLocales, "en.json")
	const englishJson = JSON.parse(await readFile(englishLocale))
	const englishLeaves = getLeaves(englishJson)
	for (let lang of ALL_LANGUAGES) {
		const path = join(rootLocales, `${lang}.json`)
		const json = JSON.parse(await readFile(path), { encoding: "utf8" })
		const leaves = getLeaves(json)
		const dots = new Set(leaves.map((l) => l.dots))
		const englishDotsSet = new Set(englishLeaves.map((l) => l.dots))

		// Detect cross-group moves: only when a base name appears exactly once
		// among orphaned keys (deleted) and exactly once among new keys (added)
		const orphanCounts = new Map()
		const orphanedByBase = new Map()
		for (let leaf of leaves) {
			if (!englishDotsSet.has(leaf.dots)) {
				orphanCounts.set(leaf.key, (orphanCounts.get(leaf.key) ?? 0) + 1)
				orphanedByBase.set(leaf.key, { path: leaf.path, value: leaf.value })
			}
		}
		for (let [key, count] of orphanCounts) {
			if (count > 1) console.warn(`(${lang}) Warning: orphaned key "${key}" appears ${count} times, skipping move detection for it`)
		}

		let newJson = {}
		/** @type {{id: string, original: string, translation: string, context: string}[]} */
		let allTranslation = []

		for (let leaf of englishLeaves) {
			let base = leaf.path.at(-1)

			if (dots.has(leaf.dots)) {
				setNestedValue(newJson, leaf.path, getNestedValue(json, leaf.path))
			} else if (orphanedByBase.has(base) && orphanCounts.get(base) === 1) {
				// Key was moved to a different group — reuse existing translation
				const orphan = orphanedByBase.get(base)
				setNestedValue(newJson, leaf.path, orphan.value)
				orphanedByBase.delete(base)
				console.log(`(${lang}) Moved ${orphan.path.join(".")} -> ${leaf.dots}`)
			} else {
				if (base.startsWith("_")) continue

				let newValue = leaf.value
				if (newValue) {
					cachedKeyContext[leaf.dots] = (cachedKeyContext[leaf.dots] ?? (await prompt(`${leaf.dots} context > `))) || ""
					newValue = await translate(base, leaf.value, cachedKeyContext[leaf.dots], allTranslation, lang)
					allTranslation.push({
						id: base,
						original: leaf.value,
						translation: newValue,
						context: cachedKeyContext[leaf.dots],
					})
					console.log(`(${lang}) Translated ${leaf.dots} to "${newValue}"`)
				}

				setNestedValue(newJson, leaf.path, newValue)
			}
		}

		await writeFile(path, JSON.stringify(newJson, null, 2), {
			encoding: "utf8",
		})
	}
}

async function ensureCasing() {
	let rootLocales = join("static", "locales")
	let englishLocale = join(rootLocales, "en.json")
	const englishJson = JSON.parse(await readFile(englishLocale))
	let englishLeaves = getLeaves(englishJson, [], true)
	englishLeaves.forEach((leave) => {
		if (leave.value && typeof leave.value === "string") {
			leave.isCapitalized = isCapitalized(leave.value, "en")
		}
	})
	englishLeaves = englishLeaves.filter((leave) => leave.isCapitalized)

	for (let lang of CASING_SENSITIVE_LANGUAGES) {
		const path = join(rootLocales, `${lang}.json`)
		const otherJson = JSON.parse(await readFile(path, { encoding: "utf8" }))
		let adjustedCount = 0

		for (let leave of englishLeaves) {
			let locale = lang.replace("_", "-")
			const value = getNestedValue(otherJson, leave.path)
			if (!value) continue
			if (!isCapitalized(value, locale)) {
				setNestedValue(otherJson, leave.path, capitalize(value, locale))
				adjustedCount++
			}
		}
		adjustedCount &&
			(await writeFile(path, JSON.stringify(otherJson, null, 2), {
				encoding: "utf8",
			}))
		console.log(`${lang}.json required ${adjustedCount} adjustments.`)
	}
}

async function build() {
	let root = join(env["FIREFOX"] ? "buildFf" : "build", "unpacked", "locales")
	let formalRoot = join(env["FIREFOX"] ? "buildFf" : "build", "unpacked", "_locales")
	let paths = []
	await walkDir(root, paths)
	paths = paths.filter((v) => v.endsWith(".json"))
	await Promise.all(
		paths.map(async (path) => {
			const localeData = JSON.parse(await readFile(path, { encoding: "utf8" }))
			const language = parse(path).name
			const formalObj = extractToplevelKeysByPrefix(localeData)
			await mkdir(join(formalRoot, language), { recursive: true })
			await writeFile(path, JSON.stringify(localeData)) // minify
			await writeFile(join(formalRoot, language, "messages.json"), JSON.stringify(formalObj))
		}),
	)
}

/**
 *
 * @param {any} data
 * @param {string} prefix
 * @returns
 */
function extractToplevelKeysByPrefix(data, prefix = ":") {
	let newObj = {}
	for (let key of Object.keys(data)) {
		if (key.startsWith(prefix)) {
			const newKey = key.slice(1)
			newObj[newKey] = { message: data[key] }
			delete data[key]
		}
	}
	return newObj
}

/**
 * @param {string} dir
 * @param {string[]} paths
 */
async function walkDir(dir, paths) {
	await Promise.all(
		(await readdir(dir, { withFileTypes: true })).map(async (item) => {
			let itemPath = join(dir, item.name)
			if (item.isDirectory()) {
				await walkDir(itemPath, paths)
			} else {
				paths.push(itemPath)
			}
		}),
	)
}

/**
 * @param {any} obj
 * @param {string[]} keys
 * @returns {any}
 */
function getNestedValue(obj, keys) {
	return keys.reduce((current, key) => current?.[key], obj)
}

/**
 * @param {any} obj
 * @param {string[]} keys
 * @param {any} value
 */
function setNestedValue(obj, keys, value) {
	let lastKey = keys[keys.length - 1]
	keys = keys.slice(0, keys.length - 1)
	keys.forEach((key) => {
		if (obj[key] && typeof obj[key] !== "object") throw "Keys lead to a non-object structure."
		obj[key] = obj[key] || {}
		obj = obj[key]
	})
	obj[lastKey] = value
	if (value === undefined) delete obj[lastKey]
}

/**
 *
 * @param {any} obj
 * @param {string[]} ctx
 * @param {boolean} ignoreOptional
 * @returns {{path: string[], dots: string, key: string, value: any}[]}
 */
function getLeaves(obj, ctx = [], ignoreOptional = false) {
	const leafs = []
	for (let key in obj) {
		if (ignoreOptional && key.startsWith("_")) continue
		if (typeof obj[key] === "object") {
			leafs.push(...getLeaves(obj[key], [...ctx, key], ignoreOptional))
		} else {
			leafs.push({
				path: [...ctx, key],
				dots: [...ctx, key].join("."),
				key,
				value: obj[key],
			})
		}
	}

	return leafs
}

function isCapitalized(text, locale) {
	if (!text) return
	return text[0].toLocaleUpperCase(locale.replace("_", "-")) === text[0]
}

function capitalize(text, locale) {
	if (!text) return
	const textArray = [...text]
	textArray[0] = textArray[0].toLocaleUpperCase(locale)
	return textArray.join("")
}

/**
 *
 * @param {string} input
 * @returns {Promise<string>}
 */
function prompt(input) {
	const reader = createInterface({
		input: process.stdin,
		output: process.stdout,
	})
	return new Promise((res, rej) => {
		reader.question(input, (value) => {
			res(value)
			reader.close()
		})
	})
}

async function complete(content, zodObject) {
	// console.log(content)
	const response = await openai.responses.parse({
		model: "gpt-5.2",
		input: [
			{ role: "system", content: "You are a helpful assistant." },
			{ role: "user", content },
		],
		text: {
			format: zodTextFormat(zodObject, "event"),
		},
	})

	return response.output_parsed
}

/**
 * @param {string} id
 * @param {string} text
 * @param {string | null} context
 * @param {{id: string, text: string, context: string}[]} batchedTranslations
 * @param {string} lang
 * @returns {Promise<string>}
 */
async function translate(id, text, context, batchedTranslations, lang) {
	const inputObj = { id, text }
	if (context) inputObj["context"] = context
	if (batchedTranslations) inputObj["batchedTranslations"] = batchedTranslations
	const input = `
Translate the provided text into '${lang}' (2 letter language code). This request was made through a unsupervised pipeline for a UI translation software. In general try to keep the translation as concise as the original text.

The input is a JSON object with the following fields:
- "id": An internal identifier. NEVER translate this.
- "text": The source text to translate. This is the ONLY field to translate.
- "context": Additional information that may be attached to this request. If provided, use this only to improve translation accuracy.
- "batchedTranslations": An array of previously translated strings from the same batch, provided for reference.

\n${JSON.stringify(inputObj, null, 2)}
`
	return (await complete(input, z.object({ translation: z.string() }))).translation
}

main()
