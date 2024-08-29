
// /// <reference types="@types/node" />


const { readdir, readFile, writeFile } = require("fs/promises")
const { join } = require("path")
const { env } = require("process")

async function main() {
    let root = env["FIREFOX"] ? "buildFf" : "build"
    let paths = []
    await walkDir(root, paths)
    paths = paths.filter(v => v.endsWith(".json") && !v.endsWith("manifest.json"))
    await Promise.all(paths.map(async path => {
        await writeFile(path, JSON.stringify(JSON.parse(await readFile(path, {encoding: "utf8"}))))
    }))
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