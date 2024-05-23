const { access, constants, rm, mkdir, writeFile } = require("fs").promises
// /// <reference types="@types/node" />

const { join } = require("path")
const CIRCLES_PATH = "static/circles/"

async function main() {
    if (!await pathExists("static")) return console.error("Static folder does not exist.")
    try {
        await rm(CIRCLES_PATH, {recursive: true})
    } catch (err) {}
    mkdir(CIRCLES_PATH)
    for (let i = 1; i < 9; i++) {
        const diameter = Math.round(i * 16)
        const svg = createCircleSvg(diameter)
        await writeFile(join(CIRCLES_PATH, `${diameter}.svg`), svg)
    }
}

async function pathExists(path) {
    try {
        await access(path, constants.W_OK)
        return true 
    } catch (err) {
        return false 
    }
}

main()

function createCircleSvg(diameter) {
    const radius = Math.round(diameter / 2)
    return `<svg width="${diameter}" height="${diameter}" xmlns="http://www.w3.org/2000/svg"><circle cx="${radius}" cy="${radius}" r="${Math.round(radius - 1)}" fill="#ffffff44" stroke="#00000044" stroke-width="2" /></svg>`
}
