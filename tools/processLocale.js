
// /// <reference types="@types/node" />

const { readdir, readFile, writeFile, mkdir } = require("fs/promises")
const { join, parse } = require("path")
const { env, argv, exit } = require("process")
const { createInterface } = require("readline")
const OpenAI = require("openai")

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
            console.error('No OpenAI key provided as environmental variable.')
            exit(1)
        }
        openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY
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
        const json = JSON.parse(await readFile(path), {encoding: 'utf8'})
        const leaves = getLeaves(json)
        let changed = false 
        let { justLeftArr, justRightArr } = getDifference(new Set(englishLeaves.map(l => l.dots)), new Set(leaves.map(l => l.dots)))
        
        if (justRightArr.length) {
            console.log(`${lang}.json pruning excess: ${[...justRightArr].join(', ')}`)
            justRightArr.forEach(dot => {
                setNestedValue(json, dot.split('.'), undefined)
            })
            changed = true 
        } 
        if (justLeftArr.length) {
            console.log(`${lang}.json grabbing required: ${[...justLeftArr].join(', ')}`)
            
            for (let item of justLeftArr) {
                cachedKeyContext[item] = (cachedKeyContext[item] ?? (await prompt(`${item} context > `))) || ""
            }

            const translated = await translate(Object.fromEntries(justLeftArr.map(dot => {
                const info = { english: englishLeaves.find(l => l.dots === dot).value }
                if (cachedKeyContext[dot]) info.context = cachedKeyContext[dot] 
                return [dot, info]
            })), lang)

            Object.entries(translated).forEach(([key, value]) => {
                setNestedValue(json, key.split('.'), value)
            })
            changed = true 
        }
        
        if (changed) {
            await writeFile(path, JSON.stringify(json, null, 2), {encoding: 'utf8'})
        } 
    }
}


async function ensureCasing() {
    let rootLocales = join("static", "locales")
    let englishLocale = join(rootLocales, "en.json")
    const englishJson = JSON.parse(await readFile(englishLocale))   
    let englishLeaves = getLeaves(englishJson)
    englishLeaves.forEach(leave => {
        if (leave.value && typeof leave.value === "string") {
            leave.isCapitalized = isCapitalized(leave.value, 'en')
        }
    })
    englishLeaves = englishLeaves.filter(leave => leave.isCapitalized)

    for (let lang of CASING_SENSITIVE_LANGUAGES) {
        const path = join(rootLocales, `${lang}.json`)
        const otherJson = JSON.parse(await readFile(path, {encoding: 'utf8'}))
        let adjustedCount = 0

        for (let leave of englishLeaves) {
            let locale = lang.replace('_', '-')
            const value = getNestedValue(otherJson, leave.path)
            if (!value) continue 
            if (!isCapitalized(value, locale)) {
                setNestedValue(otherJson, leave.path, capitalize(value, locale))
                adjustedCount++
            }
        }
        adjustedCount && (await writeFile(path, JSON.stringify(otherJson, null, 2), {encoding: 'utf8'}))
        console.log(`${lang}.json required ${adjustedCount} adjustments.`)
    }
}

async function build() {
    let root = join(env["FIREFOX"] ? "buildFf" : "build", "unpacked", "locales")
    let formalRoot = join(env["FIREFOX"] ? "buildFf" : "build", "unpacked", "_locales")
    let paths = []
    await walkDir(root, paths)
    paths = paths.filter(v => v.endsWith(".json")) 
    await Promise.all(paths.map(async path => {
        const localeData = JSON.parse(await readFile(path, {encoding: "utf8"}))
        const language = parse(path).name 
        const formalObj = extractToplevelKeysByPrefix(localeData)
        await mkdir(join(formalRoot, language), {recursive: true})
        await writeFile(path, JSON.stringify(localeData)) // minify 
        await writeFile(join(formalRoot, language, 'messages.json'), JSON.stringify(formalObj))
    }))
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
            newObj[newKey] = {message: data[key]}
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
    await Promise.all((await readdir(dir, {withFileTypes: true})).map(async item => {
        let itemPath = join(dir, item.name)
        if (item.isDirectory()) {
            await walkDir(itemPath, paths)
        } else {
            paths.push(itemPath)
        }
    }))
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
    keys.forEach(key => {
        if (obj[key] && typeof obj[key] !== 'object') throw 'Keys lead to a non-object structure.'
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
 * @returns {{path: string[], dots: string, key: string, value: any}[]}
 */
function getLeaves(obj, ctx = [], ignoreOptional = true) {
    const leafs = []
    for (let key in obj) {
        if (key.startsWith('_')) continue 
        if (typeof obj[key] === "object") {
            leafs.push(...getLeaves(obj[key], [...ctx, key], ignoreOptional))
        } else {
            leafs.push({path: [...ctx, key], dots: [...ctx, key].join('.'), key, value: obj[key]})
        }
    }

    return leafs 
}

/**
 * 
 * @param {Set<string>} left 
 * @param {Set<string>} right 
 */
function getDifference(left, right) {
    /** @type { Set<string> } */ let justLeft = new Set()
    /** @type { Set<string> } */ let justRight = new Set()

    for (let item of left) {
        if (!right.has(item)) {
            justLeft.add(item)
        }
    }

    for (let item of right) {
        if (!left.has(item)) {
            justRight.add(item)
        }
    }

    return { justLeft, justRight, justLeftArr: [...justLeft], justRightArr: [...justRight] }
}

function isCapitalized(text, locale) {
    if (!text) return 
    return text[0].toLocaleUpperCase(locale.replace('_', '-')) === text[0]
}

function capitalize(text, locale) {
    if (!text) return 
    const textArray = [...text]
    textArray[0] = textArray[0].toLocaleUpperCase(locale)
    return textArray.join('')
}

/**
 * 
 * @param {string} input 
 * @returns {Promise<string>}
 */
function prompt(input) {
    const reader = createInterface({
        input: process.stdin,
        output: process.stdout
    })
    return new Promise((res, rej) => {
        reader.question(input, value => {
            res(value)
            reader.close()
        })
    })
}

async function complete(content) {
    const response = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        { role: "system", content: "You are a helpful assistant."},
        { role: "user", content}
      ]
    })
  
    return response.choices[0].message.content
}

/**
 * @param {{[key: string]: { english: string, context: string }}} items 
 * @param {string} lang
 * @returns {Promise<{[key: string]: string}>}
 */
async function translate(items, lang, attempts = 3) {
    const input = `Translate the provided strings into '${lang}' (2 letter language code). Output should have a similar JSON structure as the input, but the value should just be a string instead of an object.\n${JSON.stringify(items, null, 2)}`
    for (let i = 0; i < attempts; i++) {
        try {
            const out = parseMessyJson((await complete(input)).trim())
            const inKeys = Object.keys(items)
    
            const outValues = Object.values(out)
            const outKeys = Object.keys(out)
            if (outKeys.length !== inKeys.length) throw 'Incorrect amount of outputs.'
            if (!outValues.every(t => typeof t === "string")) throw 'Not all values a string.'
            if (!inKeys.every(key => out[key])) throw 'Not all keys could be accounted for.'
            return out
        }  catch {
                
        }
    }
    throw `Failed to translate after ${attempts} attempts.`
}
  
function parseMessyJson(messy) {
    let start = messy.indexOf("{")
    if (start >= 0) {
        const end = messy.lastIndexOf("}")
        if (end >= 0) {
            return JSON.parse(messy.slice(start, end + 1))
        }
    }
  
    throw 'Could not parse.'
}
  


main()