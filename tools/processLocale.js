
// /// <reference types="@types/node" />


const { readdir, readFile, writeFile, mkdir } = require("fs/promises")
const { join, parse } = require("path")
const { env } = require("process")

async function main() {
    let root = join(env["FIREFOX"] ? "buildFf" : "build", "unpacked", "locales")
    let officialRoot = join(env["FIREFOX"] ? "buildFf" : "build", "unpacked", "_locales")
    let paths = []
    await walkDir(root, paths)
    paths = paths.filter(v => v.endsWith(".json")) 
    await Promise.all(paths.map(async path => {
        const localeData = JSON.parse(await readFile(path, {encoding: "utf8"}))
        const language = parse(path).name 
        const official = extractOfficial(localeData)
        await mkdir(join(officialRoot, language), {recursive: true})
        await writeFile(path, JSON.stringify(localeData)) // minify 
        await writeFile(join(officialRoot, language, 'messages.json'), JSON.stringify(official))
    }))
}

function extractOfficial(data) {
    let official = {}
    for (let key of Object.keys(data)) {
        if (key.startsWith(":")) {
            const newKey = key.slice(1)
            official[newKey] = {message: data[key]}
            delete data[key]
        }
    }
    return official
}


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

main()