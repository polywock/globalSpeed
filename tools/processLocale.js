
// /// <reference types="@types/node" />

const { readdir, readFile, writeFile, mkdir } = require("fs/promises")
const { join, parse } = require("path")
const { env, argv, exit } = require("process")

const CASING_SENSITIVE_LANGUAGES = ["de", "es", "fr", "id", "it", "ms", "pl", "pt_BR", "ru", "tr", "uk", "vi"]
const ALL_LANGUAGES = [...CASING_SENSITIVE_LANGUAGES, "ar", "ja", "ko", "th", "zh_CN", "zh_TW"]

async function main() {
    if (argv[2] === "--casing") {
        ensureCasing()
    } else if (argv[2] === "--validate") {
        if (await validate()) {
            console.log('✓ All good!')
            exit(0)
        } else {
            exit(1)
        }
    } else if (argv[2] === "--build") {
        build()
    }
}

async function validate() {
    let rootLocales = join("static", "locales")
    let englishLocale = join(rootLocales, "en.json")
    const englishJson = JSON.parse(await readFile(englishLocale))   
    const englishLeaves = getLeafPaths(englishJson, info => !info.path.some(step => step.startsWith("_")))
    const englishLeavesSet = new Set(englishLeaves)


    const outputs = await Promise.all(ALL_LANGUAGES.map(async lang => {
        let otherJson
        try {
            otherJson = JSON.parse(await readFile(join(rootLocales, `${lang}.json`), {encoding: 'utf8'}))
        } catch {
            console.error(`${lang}.json does not exist.`)
            return
        }
        let otherLeaves = getLeafPaths(otherJson, info => !info.path.some(step => step.startsWith("_")))
        const otherSet = new Set(otherLeaves)
        const { justLeft, justRight} = getDifference(englishLeavesSet, otherSet)
        if (!justLeft.size && !justRight.size) return true 

        let output = []
        output.push(`\n-----------------\n${lang}.json issues`)
        if (justLeft.size) output.push(`- missing translations: ${[...justLeft].join(', ')}`)
        if (justRight.size) output.push(`- excessive translations: ${[...justRight].join(', ')}`)
        console.error(output.join('\n'))
        return false 
    }))

    return outputs.every(o => o)
}

/**
 * 
 * @returns 
 */
async function ensureCasing() {
    if (!(await validate())) return exit(1)
    let rootLocales = join("static", "locales")
    let englishLocale = join(rootLocales, "en.json")
    const englishJson = JSON.parse(await readFile(englishLocale))   
    let englishLeaves = getLeaves(englishJson)
    englishLeaves.forEach(leave => {
        if (leave.value && typeof leave.value === "string" && leave.path[leave.path.length - 1] !== "_lang") {
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
            if (!isCapitalized(value, locale)) {
                setNestedValue(otherJson, leave.path, capitalize(value, locale))
                adjustedCount++
            }
        }
        adjustedCount && (await writeFile(path, JSON.stringify(otherJson, null, 2), {encoding: 'utf8'}))
        console.log(`${lang}.json requires ${adjustedCount} adjustments.`)
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
}

/**
 * 
 * @param {any} obj 
 * @param {string[]} ctx 
 * @returns {{path: string[], value: any}[]}
 */
function getLeaves(obj, ctx = []) {
    const leafs = []
    for (let key in obj) {
        if (typeof obj[key] === "object") {
            leafs.push(...getLeaves(obj[key], [...ctx, key]))
        } else {
            leafs.push({path: [...ctx, key], value: obj[key]})
        }
    }

    return leafs 
}

/**
 * 
 * @param {any} obj 
 * @param {(info: ReturnType<typeof getLeaves>[number]) => boolean} filterFn 
 * @returns { string[] }
 */
function getLeafPaths(obj, filterFn) {
    return getLeaves(obj).filter(item => filterFn(item)).map(item => item.path.join("."))
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

    return { justLeft, justRight }
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


main()